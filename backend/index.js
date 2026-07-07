// ============================================================================
// IMPORTS
// ============================================================================
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// ============================================================================
// CONSTANTES
// ============================================================================
const DEVISE = 'FCFA';
const PLAFOND_MAX = 100000000;
const PLAFOND_MIN = 0;

// ============================================================================
// INITIALISATION EXPRESS
// ============================================================================
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ============================================================================
// BASE DE DONNEES SQLITE
// ============================================================================
let db;

const initDB = async () => {
    db = await open({
        filename: ':memory:',
        driver: sqlite3.Database
    });

    console.log('[INFO] Base de donnees SQLite en memoire initialisee');

    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'USER',
            isLocked INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS banks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            code TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_number TEXT UNIQUE NOT NULL,
            account_type TEXT NOT NULL CHECK (account_type IN ('CHECKING', 'SAVINGS')),
            balance REAL DEFAULT 0 CHECK (balance >= ${PLAFOND_MIN} AND balance <= ${PLAFOND_MAX}),
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            bank_id INTEGER REFERENCES banks(id),
            isBlocked INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL CHECK (type IN ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'EXTERNAL')),
            amount REAL NOT NULL CHECK (amount > 0),
            description TEXT,
            account_id INTEGER REFERENCES accounts(id),
            target_account_id INTEGER REFERENCES accounts(id),
            user_id INTEGER REFERENCES users(id),
            status TEXT DEFAULT 'COMPLETED',
            reference TEXT UNIQUE,
            metadata TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Banques par defaut
    await db.run(`
        INSERT OR IGNORE INTO banks (name, code) VALUES 
            ('BNP Paribas', 'BNPP'),
            ('Societe Generale', 'SOGE'),
            ('Credit Agricole', 'CRAG'),
            ('Banque Populaire', 'BPOP'),
            ('Ecobank', 'ECOB'),
            ('UBA', 'UBA'),
            ('Afriland', 'AFRL')
    `);

    // Admin par defaut
    const adminCheck = await db.get('SELECT id FROM users WHERE email = ?', ['admin@banque.com']);
    if (!adminCheck) {
        const hashedPassword = await bcrypt.hash('Admin123!', 10);
        await db.run(
            `INSERT INTO users (name, email, phone, password, role) 
             VALUES (?, ?, ?, ?, ?)`,
            ['Administrateur', 'admin@banque.com', '0600000000', hashedPassword, 'ADMIN']
        );
        console.log('[INFO] Compte admin cree: admin@banque.com / Admin123!');
    } else {
        console.log('[INFO] Compte admin existe deja');
    }

    console.log('[INFO] Tables initialisees avec succes');
    return db;
};

// ============================================================================
// JWT CONFIGURATION
// ============================================================================
const JWT_SECRET = process.env.JWT_SECRET || 'banqueSecureSecretKey2026';
const JWT_EXPIRATION = parseInt(process.env.JWT_EXPIRATION) || 86400000;

const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email, name: user.name, role: user.role || 'USER' },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRATION / 1000 }
    );
};

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token manquant ou invalide' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expire' });
        }
        return res.status(401).json({ error: 'Token invalide' });
    }
};

const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'ADMIN') {
        next();
    } else {
        res.status(403).json({ error: 'Acces administrateur requis' });
    }
};

// ============================================================================
// 1. AUTHENTIFICATION
// ============================================================================

app.post('/api/register', [
    body('name').notEmpty().withMessage('Le nom est obligatoire'),
    body('email').isEmail().withMessage('Email invalide'),
    body('phone').matches(/^(06|07)[0-9]{8}$|^\+33[6-7][0-9]{8}$/)
        .withMessage('Format telephone invalide (06XXXXXXXX ou +336XXXXXXXX)'),
    body('password').isLength({ min: 6 }).withMessage('Mot de passe minimum 6 caracteres')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, phone, password } = req.body;

    try {
        const existing = await db.get(
            'SELECT id FROM users WHERE email = ? OR phone = ?',
            [email, phone]
        );
        if (existing) {
            return res.status(409).json({ error: 'Email ou telephone deja utilise' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await db.run(
            `INSERT INTO users (name, email, phone, password) 
             VALUES (?, ?, ?, ?)`,
            [name, email, phone, hashedPassword]
        );

        const user = await db.get(
            'SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?',
            [result.lastID]
        );

        const token = generateToken(user);

        res.status(201).json({
            message: 'Inscription reussie',
            user,
            token
        });

    } catch (error) {
        console.error('[ERREUR] Inscription:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.post('/api/login', [
    body('email').isEmail().withMessage('Email invalide'),
    body('password').notEmpty().withMessage('Mot de passe obligatoire')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
        const user = await db.get(
            'SELECT id, name, email, phone, password, role, isLocked FROM users WHERE email = ?',
            [email]
        );

        if (!user) {
            return res.status(401).json({ error: 'Identifiants invalides' });
        }

        if (user.isLocked === 1) {
            return res.status(403).json({ error: 'Compte verrouille. Contactez l\'administrateur.' });
        }

        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return res.status(401).json({ error: 'Identifiants invalides' });
        }

        delete user.password;
        const token = generateToken(user);

        res.json({
            message: 'Connexion reussie',
            user,
            token
        });

    } catch (error) {
        console.error('[ERREUR] Login:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.post('/api/logout', verifyToken, (req, res) => {
    res.json({ message: 'Deconnexion reussie' });
});

app.get('/api/profile', verifyToken, async (req, res) => {
    try {
        const user = await db.get(
            'SELECT id, name, email, phone, role, isLocked, created_at, updated_at FROM users WHERE id = ?',
            [req.user.id]
        );

        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouve' });
        }

        res.json(user);
    } catch (error) {
        console.error('[ERREUR] Profil:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.put('/api/profile', verifyToken, [
    body('name').optional().notEmpty().withMessage('Nom invalide'),
    body('phone').optional().matches(/^(06|07)[0-9]{8}$|^\+33[6-7][0-9]{8}$/)
        .withMessage('Format telephone invalide')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, phone } = req.body;
    const userId = req.user.id;

    try {
        let updateQuery = 'UPDATE users SET updated_at = CURRENT_TIMESTAMP';
        const params = [];

        if (name) {
            updateQuery += ', name = ?';
            params.push(name);
        }
        if (phone) {
            const existing = await db.get(
                'SELECT id FROM users WHERE phone = ? AND id != ?',
                [phone, userId]
            );
            if (existing) {
                return res.status(409).json({ error: 'Telephone deja utilise' });
            }
            updateQuery += ', phone = ?';
            params.push(phone);
        }

        if (params.length === 0) {
            return res.status(400).json({ error: 'Aucune donnee a modifier' });
        }

        params.push(userId);
        updateQuery += ' WHERE id = ?';

        await db.run(updateQuery, params);

        const updatedUser = await db.get(
            'SELECT id, name, email, phone, role, created_at, updated_at FROM users WHERE id = ?',
            [userId]
        );

        res.json({
            message: 'Profil mis a jour',
            user: updatedUser
        });

    } catch (error) {
        console.error('[ERREUR] Mise a jour profil:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.delete('/api/profile', verifyToken, async (req, res) => {
    try {
        const result = await db.run(
            'DELETE FROM users WHERE id = ?',
            [req.user.id]
        );

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Utilisateur non trouve' });
        }

        res.status(204).send();
    } catch (error) {
        console.error('[ERREUR] Suppression compte:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ============================================================================
// 2. GESTION DES COMPTES (UTILISATEUR)
// ============================================================================

app.post('/api/accounts', verifyToken, [
    body('accountType').isIn(['CHECKING', 'SAVINGS']).withMessage('Type de compte invalide'),
    body('bankId').isInt().withMessage('Banque invalide'),
    body('initialBalance').optional().isFloat({ min: 0, max: PLAFOND_MAX })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { accountType, bankId, initialBalance = 0 } = req.body;
    const userId = req.user.id;

    try {
        const bankCheck = await db.get('SELECT id FROM banks WHERE id = ?', [bankId]);
        if (!bankCheck) {
            return res.status(404).json({ error: 'Banque non trouvee' });
        }

        const accountNumber = 'ACC-' + uuidv4().substring(0, 8).toUpperCase();

        const result = await db.run(
            `INSERT INTO accounts (account_number, account_type, balance, user_id, bank_id, isBlocked)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [accountNumber, accountType, initialBalance, userId, bankId, 0]
        );

        const account = await db.get(
            `SELECT a.*, b.name as bank_name, b.code as bank_code
             FROM accounts a
             LEFT JOIN banks b ON a.bank_id = b.id
             WHERE a.id = ?`,
            [result.lastID]
        );

        res.status(201).json({
            message: 'Compte cree avec succes',
            account
        });

    } catch (error) {
        console.error('[ERREUR] Creation compte:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/api/accounts', verifyToken, async (req, res) => {
    try {
        const accounts = await db.all(
            `SELECT a.*, b.name as bank_name, b.code as bank_code
             FROM accounts a
             LEFT JOIN banks b ON a.bank_id = b.id
             WHERE a.user_id = ?
             ORDER BY a.created_at DESC`,
            [req.user.id]
        );

        res.json(accounts);
    } catch (error) {
        console.error('[ERREUR] Liste comptes:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/api/accounts/:number', verifyToken, async (req, res) => {
    try {
        const account = await db.get(
            `SELECT a.*, b.name as bank_name, b.code as bank_code
             FROM accounts a
             LEFT JOIN banks b ON a.bank_id = b.id
             WHERE a.account_number = ? AND a.user_id = ?`,
            [req.params.number, req.user.id]
        );

        if (!account) {
            return res.status(404).json({ error: 'Compte non trouve' });
        }

        res.json(account);
    } catch (error) {
        console.error('[ERREUR] Detail compte:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.delete('/api/accounts/:id', verifyToken, async (req, res) => {
    try {
        const account = await db.get(
            'SELECT balance FROM accounts WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );

        if (!account) {
            return res.status(404).json({ error: 'Compte non trouve' });
        }

        if (account.balance > 0) {
            return res.status(400).json({ error: 'Impossible de fermer un compte avec un solde positif' });
        }

        const result = await db.run(
            'DELETE FROM accounts WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Compte non trouve' });
        }

        res.status(204).send();
    } catch (error) {
        console.error('[ERREUR] Fermeture compte:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ============================================================================
// 3. DEPOT EXTERNE (AVEC VERIFICATION DU COMPTE SOURCE)
// ============================================================================

app.post('/api/accounts/deposit', verifyToken, [
    body('accountId').isInt().withMessage('Compte destination invalide'),
    body('amount').isFloat({ min: 1, max: PLAFOND_MAX }).withMessage(`Montant invalide (max ${PLAFOND_MAX} FCFA)`),
    body('sourceBankId').isInt().withMessage('Banque source invalide'),
    body('sourceAccountNumber').isLength({ min: 3 }).withMessage('Numero de compte source invalide')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { accountId, amount, sourceBankId, sourceAccountNumber, description, reference } = req.body;
    const userId = req.user.id;

    try {
        // 1. VERIFIER LE COMPTE DESTINATION
        const account = await db.get(
            'SELECT id, account_number, balance, isBlocked FROM accounts WHERE id = ? AND user_id = ?',
            [accountId, userId]
        );
        if (!account) {
            return res.status(404).json({ error: 'Compte destination non trouve' });
        }

        // 2. VERIFIER QUE LE COMPTE DESTINATION N'EST PAS BLOQUE
        if (account.isBlocked === 1) {
            return res.status(403).json({ error: 'Ce compte est bloque. Veuillez contacter l\'administrateur.' });
        }

        // 3. VERIFIER LE PLAFOND DU COMPTE DESTINATION
        const newBalance = account.balance + amount;
        if (newBalance > PLAFOND_MAX) {
            return res.status(400).json({ error: `Solde maximum autorise: ${PLAFOND_MAX} FCFA` });
        }

        // 4. VERIFIER QUE LA BANQUE SOURCE EXISTE
        const sourceBank = await db.get(
            'SELECT id, name FROM banks WHERE id = ?',
            [sourceBankId]
        );
        if (!sourceBank) {
            return res.status(404).json({ 
                error: 'Banque source non trouvee. Veuillez selectionner une banque valide.'
            });
        }

        // 5. VERIFIER QUE LE COMPTE SOURCE EXISTE DANS LA BANQUE SOURCE
        const sourceAccount = await db.get(
            'SELECT a.*, u.name as user_name FROM accounts a ' +
            'LEFT JOIN users u ON a.user_id = u.id ' +
            'WHERE a.account_number = ? AND a.bank_id = ?',
            [sourceAccountNumber, sourceBankId]
        );

        if (!sourceAccount) {
            return res.status(404).json({ 
                error: `Compte source "${sourceAccountNumber}" non trouve dans la banque ${sourceBank.name}.`,
                suggestion: 'Verifiez le numero de compte et la banque selectionnee.'
            });
        }

        // 6. VERIFIER QUE LE COMPTE SOURCE N'EST PAS BLOQUE
        if (sourceAccount.isBlocked === 1) {
            return res.status(403).json({ 
                error: 'Le compte source est bloque. Utilisez un autre compte.'
            });
        }

        // 7. VERIFIER QUE LE COMPTE SOURCE A ASSEZ D'ARGENT
        if (sourceAccount.balance < amount) {
            return res.status(400).json({ 
                error: `Solde insuffisant sur le compte source. Solde disponible : ${sourceAccount.balance} FCFA`
            });
        }

        // 8. VERIFIER QUE LE COMPTE SOURCE N'APPARTIENT PAS A L'UTILISATEUR CONNECTE
        if (sourceAccount.user_id === userId) {
            return res.status(400).json({ 
                error: 'Le compte source vous appartient. Utilisez la fonction "Transfert" pour vos propres comptes.'
            });
        }

        // 9. TOUT EST OK → EFFECTUER LE DEPOT
        // Débiter le compte source
        const newSourceBalance = sourceAccount.balance - amount;
        await db.run(
            'UPDATE accounts SET balance = ? WHERE id = ?',
            [newSourceBalance, sourceAccount.id]
        );

        // Créditer le compte destination
        await db.run(
            'UPDATE accounts SET balance = ? WHERE id = ?',
            [newBalance, accountId]
        );

        const depositRef = reference || 'DEP-' + Date.now();
        const fullDescription = description || `Depot depuis ${sourceBank.name}`;
        
        const metadata = JSON.stringify({
            source_bank_id: sourceBank.id,
            source_bank: sourceBank.name,
            source_account_id: sourceAccount.id,
            source_account: sourceAccountNumber,
            source_user: sourceAccount.user_name || 'Inconnu',
            type: 'external_deposit',
            devise: DEVISE,
            verified: true
        });

        await db.run(
            `INSERT INTO transactions (
                type, amount, description, account_id, user_id, 
                reference, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                'DEPOSIT', 
                amount, 
                fullDescription, 
                accountId, 
                userId, 
                depositRef,
                metadata
            ]
        );

        res.json({
            message: 'Depot externe effectue avec succes',
            devise: DEVISE,
            compte: {
                id: account.id,
                account_number: account.account_number,
                nouveau_solde: newBalance
            },
            source: {
                bank: sourceBank.name,
                account: sourceAccountNumber,
                titulaire: sourceAccount.user_name || 'Inconnu'
            },
            reference: depositRef
        });

    } catch (error) {
        console.error('[ERREUR] Depot:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ============================================================================
// 4. TRANSACTIONS
// ============================================================================

// POST /api/transactions/withdraw - Retrait (avec vérification du plafond)
app.post('/api/transactions/withdraw', verifyToken, [
    body('accountId').isInt().withMessage('Compte invalide'),
    body('amount').isFloat({ min: 1, max: PLAFOND_MAX }).withMessage(`Montant invalide (max ${PLAFOND_MAX} FCFA)`)
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { accountId, amount, description } = req.body;
    const userId = req.user.id;

    try {
        // 1. VERIFIER QUE LE COMPTE EXISTE
        const account = await db.get(
            'SELECT id, balance, isBlocked FROM accounts WHERE id = ? AND user_id = ?',
            [accountId, userId]
        );
        if (!account) {
            return res.status(404).json({ error: 'Compte non trouve' });
        }

        // 2. VERIFIER QUE LE COMPTE N'EST PAS BLOQUE
        if (account.isBlocked === 1) {
            return res.status(403).json({ error: 'Ce compte est bloque. Veuillez contacter l\'administrateur.' });
        }

        // 3. VERIFIER LE SOLDE
        if (account.balance < amount) {
            return res.status(400).json({ error: `Solde insuffisant. Solde disponible : ${account.balance} FCFA` });
        }

        // 4. EFFECTUER LE RETRAIT
        const newBalance = account.balance - amount;
        await db.run(
            'UPDATE accounts SET balance = ? WHERE id = ?',
            [newBalance, accountId]
        );

        const reference = 'WTH-' + Date.now();
        await db.run(
            `INSERT INTO transactions (type, amount, description, account_id, user_id, reference)
             VALUES (?, ?, ?, ?, ?, ?)`,
            ['WITHDRAWAL', amount, description || 'Retrait effectue', accountId, userId, reference]
        );

        res.json({
            message: 'Retrait effectue avec succes',
            devise: DEVISE,
            nouveau_solde: newBalance,
            reference
        });

    } catch (error) {
        console.error('[ERREUR] Retrait:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// POST /api/transactions/transfer - Transfert entre comptes (avec vérification complète)
app.post('/api/transactions/transfer', verifyToken, [
    body('fromAccountId').isInt().withMessage('Compte source invalide'),
    body('toAccountId').isInt().withMessage('Compte destination invalide'),
    body('amount').isFloat({ min: 1, max: PLAFOND_MAX }).withMessage(`Montant invalide (max ${PLAFOND_MAX} FCFA)`)
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { fromAccountId, toAccountId, amount, description } = req.body;
    const userId = req.user.id;

    // 1. VERIFIER QUE LES COMPTES SONT DIFFERENTS
    if (fromAccountId === toAccountId) {
        return res.status(400).json({ error: 'Impossible de transferer vers le meme compte' });
    }

    try {
        // 2. VERIFIER LE COMPTE SOURCE
        const fromAccount = await db.get(
            'SELECT id, balance, isBlocked FROM accounts WHERE id = ? AND user_id = ?',
            [fromAccountId, userId]
        );
        if (!fromAccount) {
            return res.status(404).json({ error: 'Compte source non trouve' });
        }

        // 3. VERIFIER QUE LE COMPTE SOURCE N'EST PAS BLOQUE
        if (fromAccount.isBlocked === 1) {
            return res.status(403).json({ error: 'Le compte source est bloque. Veuillez contacter l\'administrateur.' });
        }

        // 4. VERIFIER LE COMPTE DESTINATION
        const toAccount = await db.get(
            'SELECT id, balance, isBlocked FROM accounts WHERE id = ? AND user_id = ?',
            [toAccountId, userId]
        );
        if (!toAccount) {
            return res.status(404).json({ error: 'Compte destination non trouve' });
        }

        // 5. VERIFIER QUE LE COMPTE DESTINATION N'EST PAS BLOQUE
        if (toAccount.isBlocked === 1) {
            return res.status(403).json({ error: 'Le compte destination est bloque. Veuillez contacter l\'administrateur.' });
        }

        // 6. VERIFIER LE SOLDE SOURCE
        if (fromAccount.balance < amount) {
            return res.status(400).json({ error: `Solde insuffisant. Solde disponible : ${fromAccount.balance} FCFA` });
        }

        // 7. VERIFIER LE PLAFOND DESTINATION
        const newToBalance = toAccount.balance + amount;
        if (newToBalance > PLAFOND_MAX) {
            return res.status(400).json({ error: `Solde maximum autorise pour le compte destination: ${PLAFOND_MAX} FCFA` });
        }

        // 8. EFFECTUER LE TRANSFERT
        const newFromBalance = fromAccount.balance - amount;
        await db.run(
            'UPDATE accounts SET balance = ? WHERE id = ?',
            [newFromBalance, fromAccountId]
        );

        await db.run(
            'UPDATE accounts SET balance = ? WHERE id = ?',
            [newToBalance, toAccountId]
        );

        const reference = 'TRF-' + Date.now();
        await db.run(
            `INSERT INTO transactions (type, amount, description, account_id, target_account_id, user_id, reference)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            ['TRANSFER', amount, description || 'Transfert entre comptes', fromAccountId, toAccountId, userId, reference]
        );

        res.json({
            message: 'Transfert effectue avec succes',
            devise: DEVISE,
            nouveau_solde_source: newFromBalance,
            nouveau_solde_destination: newToBalance,
            reference
        });

    } catch (error) {
        console.error('[ERREUR] Transfert:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// POST /api/transactions/external - Virement externe (avec vérification complète)
app.post('/api/transactions/external', verifyToken, [
    body('fromAccountId').isInt().withMessage('Compte source invalide'),
    body('toBankId').isInt().withMessage('Banque destination invalide'),
    body('toAccountNumber').isLength({ min: 5 }).withMessage('Numero de compte destination invalide (minimum 5 caracteres)'),
    body('amount').isFloat({ min: 1, max: PLAFOND_MAX }).withMessage(`Montant invalide (max ${PLAFOND_MAX} FCFA)`)
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { fromAccountId, toBankId, toAccountNumber, amount, description } = req.body;
    const userId = req.user.id;

    try {
        // 1. VERIFIER LE COMPTE SOURCE
        const fromAccount = await db.get(
            'SELECT id, balance, isBlocked FROM accounts WHERE id = ? AND user_id = ?',
            [fromAccountId, userId]
        );
        if (!fromAccount) {
            return res.status(404).json({ error: 'Compte source non trouve' });
        }

        // 2. VERIFIER QUE LE COMPTE SOURCE N'EST PAS BLOQUE
        if (fromAccount.isBlocked === 1) {
            return res.status(403).json({ error: 'Le compte source est bloque. Veuillez contacter l\'administrateur.' });
        }

        // 3. VERIFIER LE SOLDE SOURCE
        if (fromAccount.balance < amount) {
            return res.status(400).json({ error: `Solde insuffisant. Solde disponible : ${fromAccount.balance} FCFA` });
        }

        // 4. VERIFIER QUE LA BANQUE DESTINATION EXISTE
        const toBank = await db.get(
            'SELECT id, name, code FROM banks WHERE id = ?',
            [toBankId]
        );
        if (!toBank) {
            return res.status(404).json({ 
                error: 'Banque destination non trouvee. Veuillez selectionner une banque valide.'
            });
        }

        // 5. VERIFIER QUE LE COMPTE DESTINATION EXISTE DANS LA BANQUE DESTINATION
        const toAccount = await db.get(
            'SELECT a.*, u.name as user_name, u.email as user_email FROM accounts a ' +
            'LEFT JOIN users u ON a.user_id = u.id ' +
            'WHERE a.account_number = ? AND a.bank_id = ?',
            [toAccountNumber, toBankId]
        );

        if (!toAccount) {
            return res.status(404).json({ 
                error: `Compte destination "${toAccountNumber}" non trouve dans la banque ${toBank.name}.`,
                suggestion: 'Verifiez le numero de compte et la banque selectionnee.'
            });
        }

        // 6. VERIFIER QUE LE COMPTE DESTINATION N'EST PAS BLOQUE
        if (toAccount.isBlocked === 1) {
            return res.status(403).json({ 
                error: 'Le compte destination est bloque. Veuillez contacter le proprietaire du compte.'
            });
        }

        // 7. VERIFIER QUE LE COMPTE DESTINATION N'APPARTIENT PAS A L'UTILISATEUR CONNECTE
        if (toAccount.user_id === userId) {
            return res.status(400).json({ 
                error: 'Ce compte vous appartient. Utilisez la fonction "Virement" pour transferer entre vos comptes.'
            });
        }

        // 8. VERIFIER LE PLAFOND DU COMPTE DESTINATION
        const newToBalance = toAccount.balance + amount;
        if (newToBalance > PLAFOND_MAX) {
            return res.status(400).json({ 
                error: `Le solde du compte destination ne peut pas depasser ${PLAFOND_MAX} FCFA.`
            });
        }

        // 9. EFFECTUER LE VIREMENT EXTERNE
        const newFromBalance = fromAccount.balance - amount;
        await db.run(
            'UPDATE accounts SET balance = ? WHERE id = ?',
            [newFromBalance, fromAccountId]
        );

        await db.run(
            'UPDATE accounts SET balance = ? WHERE id = ?',
            [newToBalance, toAccount.id]
        );

        const reference = 'EXT-' + Date.now();
        const metadata = JSON.stringify({
            target_bank_id: toBank.id,
            target_bank: toBank.name,
            target_account_id: toAccount.id,
            target_account: toAccount.account_number,
            target_user: toAccount.user_name || 'Inconnu',
            target_user_id: toAccount.user_id,
            type: 'external_transfer',
            devise: DEVISE,
            verified: true
        });

        await db.run(
            `INSERT INTO transactions (type, amount, description, account_id, target_account_id, user_id, reference, metadata)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                'EXTERNAL', 
                amount, 
                description || `Virement vers ${toBank.name} - ${toAccount.account_number}`, 
                fromAccountId, 
                toAccount.id, 
                userId, 
                reference,
                metadata
            ]
        );

        res.json({
            message: 'Virement externe effectue avec succes',
            devise: DEVISE,
            nouveau_solde: newFromBalance,
            reference,
            destination: {
                bank: toBank.name,
                account: toAccount.account_number,
                titulaire: toAccount.user_name || 'Inconnu'
            }
        });

    } catch (error) {
        console.error('[ERREUR] Virement externe:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/api/transactions', verifyToken, async (req, res) => {
    try {
        const transactions = await db.all(
            `SELECT t.*, 
                    a.account_number as account_number,
                    ta.account_number as target_account_number
             FROM transactions t
             LEFT JOIN accounts a ON t.account_id = a.id
             LEFT JOIN accounts ta ON t.target_account_id = ta.id
             WHERE t.user_id = ?
             ORDER BY t.created_at DESC`,
            [req.user.id]
        );

        res.json({
            devise: DEVISE,
            transactions: transactions
        });

    } catch (error) {
        console.error('[ERREUR] Historique transactions:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ============================================================================
// 5. VERIFICATION DE COMPTE
// ============================================================================

// POST /api/accounts/check - Vérifier un compte par banque + numéro
app.post('/api/accounts/check', verifyToken, [
    body('bankId').isInt().withMessage('Banque invalide'),
    body('accountNumber').isLength({ min: 5 }).withMessage('Numero de compte invalide')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { bankId, accountNumber } = req.body;
    const userId = req.user.id;

    try {
        // 1. VERIFIER QUE LA BANQUE EXISTE
        const bank = await db.get(
            'SELECT id, name FROM banks WHERE id = ?',
            [bankId]
        );
        if (!bank) {
            return res.status(404).json({ error: 'Banque non trouvee' });
        }

        // 2. VERIFIER QUE LE COMPTE EXISTE DANS CETTE BANQUE
        const account = await db.get(
            'SELECT a.*, u.name as user_name, u.email as user_email, b.name as bank_name ' +
            'FROM accounts a ' +
            'LEFT JOIN users u ON a.user_id = u.id ' +
            'LEFT JOIN banks b ON a.bank_id = b.id ' +
            'WHERE a.account_number = ? AND a.bank_id = ?',
            [accountNumber, bankId]
        );

        if (!account) {
            return res.status(404).json({ 
                error: 'Compte non trouve dans cette banque',
                bank: bank.name
            });
        }

        // 3. VERIFIER QUE LE COMPTE N'APPARTIENT PAS A L'UTILISATEUR CONNECTE
        if (account.user_id === userId) {
            return res.status(400).json({ 
                error: 'Ce compte vous appartient. Utilisez la fonction "Virement".'
            });
        }

        // 4. VERIFIER QUE LE COMPTE N'EST PAS BLOQUE
        if (account.isBlocked === 1) {
            return res.status(403).json({ 
                error: 'Ce compte est bloque. Contactez le proprietaire.'
            });
        }

        // 5. RETOURNER LES INFORMATIONS DU COMPTE
        res.json({
            id: account.id,
            account_number: account.account_number,
            account_type: account.account_type,
            balance: account.balance,
            user_name: account.user_name || 'Inconnu',
            user_email: account.user_email || 'Inconnu',
            bank_name: account.bank_name,
            isBlocked: account.isBlocked === 1
        });

    } catch (error) {
        console.error('[ERREUR] Verification compte:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ============================================================================
// 6. GESTION DES BANQUES
// ============================================================================

app.get('/api/banks', async (req, res) => {
    try {
        const banks = await db.all(
            'SELECT id, name, code, created_at FROM banks ORDER BY name'
        );
        res.json(banks);
    } catch (error) {
        console.error('[ERREUR] Liste banques:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/api/banks/:id', async (req, res) => {
    try {
        const bank = await db.get(
            'SELECT id, name, code, created_at FROM banks WHERE id = ?',
            [req.params.id]
        );

        if (!bank) {
            return res.status(404).json({ error: 'Banque non trouvee' });
        }

        res.json(bank);
    } catch (error) {
        console.error('[ERREUR] Detail banque:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ============================================================================
// 7. ROUTES ADMIN
// ============================================================================

app.get('/api/users', verifyToken, isAdmin, async (req, res) => {
    try {
        const users = await db.all(
            'SELECT id, name, email, phone, role, isLocked, created_at FROM users ORDER BY created_at DESC'
        );
        res.json(users);
    } catch (error) {
        console.error('[ERREUR] Liste users:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/api/admin/accounts', verifyToken, isAdmin, async (req, res) => {
    try {
        const accounts = await db.all(`
            SELECT a.*, u.name as user_name, u.email as user_email, b.name as bank_name
            FROM accounts a
            LEFT JOIN users u ON a.user_id = u.id
            LEFT JOIN banks b ON a.bank_id = b.id
            ORDER BY a.created_at DESC
        `);
        res.json(accounts);
    } catch (error) {
        console.error('[ERREUR] Liste comptes admin:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/api/admin/transactions', verifyToken, isAdmin, async (req, res) => {
    try {
        const transactions = await db.all(`
            SELECT t.*, 
                   a.account_number as account_number,
                   ta.account_number as target_account_number,
                   u.name as user_name
            FROM transactions t
            LEFT JOIN accounts a ON t.account_id = a.id
            LEFT JOIN accounts ta ON t.target_account_id = ta.id
            LEFT JOIN users u ON t.user_id = u.id
            ORDER BY t.created_at DESC
        `);
        res.json(transactions);
    } catch (error) {
        console.error('[ERREUR] Liste transactions admin:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.post('/api/admin/users', verifyToken, isAdmin, [
    body('name').notEmpty().withMessage('Le nom est obligatoire'),
    body('email').isEmail().withMessage('Email invalide'),
    body('phone').matches(/^(06|07)[0-9]{8}$|^\+33[6-7][0-9]{8}$/)
        .withMessage('Format telephone invalide'),
    body('password').isLength({ min: 6 }).withMessage('Mot de passe minimum 6 caracteres'),
    body('role').optional().isIn(['USER', 'ADMIN']).withMessage('Role invalide')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, phone, password, role = 'USER' } = req.body;

    try {
        const existing = await db.get(
            'SELECT id FROM users WHERE email = ? OR phone = ?',
            [email, phone]
        );
        if (existing) {
            return res.status(409).json({ error: 'Email ou telephone deja utilise' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await db.run(
            `INSERT INTO users (name, email, phone, password, role) 
             VALUES (?, ?, ?, ?, ?)`,
            [name, email, phone, hashedPassword, role]
        );

        const user = await db.get(
            'SELECT id, name, email, phone, role, created_at FROM users WHERE id = ?',
            [result.lastID]
        );

        res.status(201).json({
            message: 'Utilisateur cree avec succes',
            user
        });

    } catch (error) {
        console.error('[ERREUR] Creation user admin:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.put('/api/admin/users/:id/lock', verifyToken, isAdmin, async (req, res) => {
    try {
        const result = await db.run(
            'UPDATE users SET isLocked = 1 WHERE id = ?',
            [req.params.id]
        );
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Utilisateur non trouve' });
        }
        const user = await db.get(
            'SELECT id, name, email, isLocked FROM users WHERE id = ?',
            [req.params.id]
        );
        res.json({ message: 'Utilisateur verrouille', user });
    } catch (error) {
        console.error('[ERREUR] Verrouillage user:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.put('/api/admin/users/:id/unlock', verifyToken, isAdmin, async (req, res) => {
    try {
        const result = await db.run(
            'UPDATE users SET isLocked = 0 WHERE id = ?',
            [req.params.id]
        );
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Utilisateur non trouve' });
        }
        const user = await db.get(
            'SELECT id, name, email, isLocked FROM users WHERE id = ?',
            [req.params.id]
        );
        res.json({ message: 'Utilisateur deverrouille', user });
    } catch (error) {
        console.error('[ERREUR] Deverrouillage user:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.delete('/api/admin/users/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        await db.run('DELETE FROM transactions WHERE user_id = ?', [req.params.id]);
        await db.run('DELETE FROM accounts WHERE user_id = ?', [req.params.id]);
        const result = await db.run('DELETE FROM users WHERE id = ?', [req.params.id]);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Utilisateur non trouve' });
        }
        res.status(204).send();
    } catch (error) {
        console.error('[ERREUR] Suppression user:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.post('/api/admin/accounts', verifyToken, isAdmin, [
    body('userId').isInt().withMessage('Utilisateur invalide'),
    body('accountType').isIn(['CHECKING', 'SAVINGS']).withMessage('Type de compte invalide'),
    body('bankId').isInt().withMessage('Banque invalide'),
    body('balance').optional().isFloat({ min: 0, max: PLAFOND_MAX })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { userId, accountType, bankId, balance = 0 } = req.body;

    try {
        const userCheck = await db.get('SELECT id FROM users WHERE id = ?', [userId]);
        if (!userCheck) {
            return res.status(404).json({ error: 'Utilisateur non trouve' });
        }

        const bankCheck = await db.get('SELECT id FROM banks WHERE id = ?', [bankId]);
        if (!bankCheck) {
            return res.status(404).json({ error: 'Banque non trouvee' });
        }

        const accountNumber = 'ACC-' + uuidv4().substring(0, 8).toUpperCase();

        const result = await db.run(
            `INSERT INTO accounts (account_number, account_type, balance, user_id, bank_id)
             VALUES (?, ?, ?, ?, ?)`,
            [accountNumber, accountType, balance, userId, bankId]
        );

        const account = await db.get(
            `SELECT a.*, u.name as user_name, b.name as bank_name
             FROM accounts a
             LEFT JOIN users u ON a.user_id = u.id
             LEFT JOIN banks b ON a.bank_id = b.id
             WHERE a.id = ?`,
            [result.lastID]
        );

        res.status(201).json({
            message: 'Compte cree avec succes',
            account
        });

    } catch (error) {
        console.error('[ERREUR] Creation compte admin:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.put('/api/admin/accounts/:id', verifyToken, isAdmin, [
    body('balance').isFloat({ min: 0, max: PLAFOND_MAX }).withMessage('Solde invalide')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { balance } = req.body;

    try {
        const result = await db.run(
            'UPDATE accounts SET balance = ? WHERE id = ?',
            [balance, req.params.id]
        );
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Compte non trouve' });
        }
        const account = await db.get(
            `SELECT a.*, u.name as user_name, b.name as bank_name
             FROM accounts a
             LEFT JOIN users u ON a.user_id = u.id
             LEFT JOIN banks b ON a.bank_id = b.id
             WHERE a.id = ?`,
            [req.params.id]
        );
        res.json({ message: 'Compte mis a jour', account });
    } catch (error) {
        console.error('[ERREUR] Mise a jour compte:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.delete('/api/admin/accounts/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        await db.run('DELETE FROM transactions WHERE account_id = ? OR target_account_id = ?', [req.params.id, req.params.id]);
        const result = await db.run('DELETE FROM accounts WHERE id = ?', [req.params.id]);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Compte non trouve' });
        }
        res.status(204).send();
    } catch (error) {
        console.error('[ERREUR] Suppression compte:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.put('/api/admin/anomalies/:id/resolve', verifyToken, isAdmin, async (req, res) => {
    try {
        const result = await db.run(
            'UPDATE transactions SET status = ? WHERE id = ?',
            ['RESOLVED', req.params.id]
        );
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Anomalie non trouvee' });
        }
        res.json({ message: 'Anomalie resolue avec succes' });
    } catch (error) {
        console.error('[ERREUR] Resolution anomalie:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.post('/api/banks', verifyToken, isAdmin, [
    body('name').notEmpty().withMessage('Nom obligatoire'),
    body('code').notEmpty().withMessage('Code obligatoire')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, code } = req.body;

    try {
        const existing = await db.get(
            'SELECT id FROM banks WHERE name = ? OR code = ?',
            [name, code]
        );
        if (existing) {
            return res.status(409).json({ error: 'Banque deja existante' });
        }

        const result = await db.run(
            'INSERT INTO banks (name, code) VALUES (?, ?)',
            [name, code]
        );

        const bank = await db.get(
            'SELECT * FROM banks WHERE id = ?',
            [result.lastID]
        );

        res.status(201).json({
            message: 'Banque ajoutee avec succes',
            bank
        });

    } catch (error) {
        console.error('[ERREUR] Ajout banque:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.delete('/api/banks/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const result = await db.run(
            'DELETE FROM banks WHERE id = ?',
            [req.params.id]
        );

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Banque non trouvee' });
        }

        res.status(204).send();
    } catch (error) {
        console.error('[ERREUR] Suppression banque:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ============================================================================
// 8. ENDPOINTS DE TEST
// ============================================================================

app.get('/api/health', async (req, res) => {
    try {
        const userCount = await db.get('SELECT COUNT(*) as count FROM users');
        const bankCount = await db.get('SELECT COUNT(*) as count FROM banks');
        res.json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            devise: DEVISE,
            users: userCount?.count || 0,
            banks: bankCount?.count || 0
        });
    } catch (error) {
        res.status(500).json({ status: 'ERROR', message: error.message });
    }
});

app.get('/api/ping', (req, res) => {
    res.json({ pong: true, timestamp: new Date().toISOString(), devise: DEVISE });
});

app.get('/api/version', (req, res) => {
    res.json({
        version: '1.0.0',
        name: 'Banking API',
        devise: DEVISE,
        plafond_max: PLAFOND_MAX
    });
});

// ============================================================================
// GESTION DES ERREURS
// ============================================================================
app.use((err, req, res, next) => {
    console.error('[ERREUR] Globale:', err);
    res.status(500).json({ error: 'Erreur serveur interne' });
});

// ============================================================================
// DEMARRAGE
// ============================================================================
const startServer = async () => {
    try {
        await initDB();
        app.listen(PORT, () => {
            console.log(`[INFO] Serveur demarre sur http://localhost:${PORT}`);
            console.log(`[INFO] Devise: ${DEVISE}`);
            console.log(`[INFO] Plafond maximum: ${PLAFOND_MAX} ${DEVISE}`);
            console.log('[INFO] Compte admin: admin@banque.com / Admin123!');
            console.log('[INFO] Tous les endpoints sont disponibles');
        });
    } catch (error) {
        console.error('[ERREUR] Demarrage:', error);
        process.exit(1);
    }
};

startServer();

export default app;
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../index.js';

let adminToken;
let userToken;
let userId;
let accountId;
let sourceAccountId;

// ============================================================================
// 1. AUTHENTIFICATION
// ============================================================================

describe('1. AUTHENTIFICATION', () => {

    describe('POST /api/register', () => {
        it('TC1: Inscription reussie', async () => {
            const res = await request(app)
                .post('/api/register')
                .send({
                    name: 'Jean Dupont',
                    email: `jean_${Date.now()}@test.com`,
                    phone: '0612345678',
                    password: 'password123'
                });
            
            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveProperty('token');
            expect(res.body.user).toHaveProperty('id');
            userId = res.body.user.id;
        });

        it('TC2: Email invalide', async () => {
            const res = await request(app)
                .post('/api/register')
                .send({
                    name: 'Jean Dupont',
                    email: 'jean@',
                    phone: '0612345678',
                    password: 'password123'
                });
            
            expect(res.statusCode).toBe(400);
            expect(res.body.errors).toBeDefined();
        });

        it('TC3: Telephone invalide', async () => {
            const res = await request(app)
                .post('/api/register')
                .send({
                    name: 'Jean Dupont',
                    email: 'jean@test.com',
                    phone: '123',
                    password: 'password123'
                });
            
            expect(res.statusCode).toBe(400);
            expect(res.body.errors).toBeDefined();
        });

        it('TC4: Mot de passe trop court', async () => {
            const res = await request(app)
                .post('/api/register')
                .send({
                    name: 'Jean Dupont',
                    email: 'jean@test.com',
                    phone: '0612345678',
                    password: '123'
                });
            
            expect(res.statusCode).toBe(400);
            expect(res.body.errors).toBeDefined();
        });

        it('TC5: Email deja existant', async () => {
            const res = await request(app)
                .post('/api/register')
                .send({
                    name: 'Jean Dupont',
                    email: 'admin@banque.com',
                    phone: '0612345679',
                    password: 'password123'
                });
            
            expect(res.statusCode).toBe(409);
            expect(res.body.error).toContain('Email ou telephone deja utilise');
        });
    });

    describe('POST /api/login', () => {
        it('TC1: Connexion reussie Admin', async () => {
            const res = await request(app)
                .post('/api/login')
                .send({
                    email: 'admin@banque.com',
                    password: 'Admin123!'
                });
            
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('token');
            expect(res.body.user).toHaveProperty('role', 'ADMIN');
            adminToken = res.body.token;
        });

        it('TC2: Email invalide', async () => {
            const res = await request(app)
                .post('/api/login')
                .send({
                    email: 'admin@',
                    password: 'Admin123!'
                });
            
            expect(res.statusCode).toBe(400);
        });

        it('TC3: Utilisateur non trouve', async () => {
            const res = await request(app)
                .post('/api/login')
                .send({
                    email: 'inexistant@test.com',
                    password: 'password'
                });
            
            expect(res.statusCode).toBe(401);
        });

        it('TC4: Mot de passe incorrect', async () => {
            const res = await request(app)
                .post('/api/login')
                .send({
                    email: 'admin@banque.com',
                    password: 'wrongpassword'
                });
            
            expect(res.statusCode).toBe(401);
        });
    });
});

// ============================================================================
// 2. GESTION DES COMPTES
// ============================================================================

describe('2. GESTION DES COMPTES', () => {

    describe('POST /api/accounts', () => {
        it('TC1: Creation compte reussie', async () => {
            const res = await request(app)
                .post('/api/accounts')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    accountType: 'CHECKING',
                    bankId: 1,
                    initialBalance: 10000
                });
            
            expect(res.statusCode).toBe(201);
            expect(res.body.account).toHaveProperty('account_number');
            accountId = res.body.account.id;
        });

        it('TC2: Type de compte invalide', async () => {
            const res = await request(app)
                .post('/api/accounts')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    accountType: 'INVALID',
                    bankId: 1
                });
            
            expect(res.statusCode).toBe(400);
        });

        it('TC3: Banque non trouvee', async () => {
            const res = await request(app)
                .post('/api/accounts')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    accountType: 'CHECKING',
                    bankId: 999
                });
            
            expect(res.statusCode).toBe(404);
        });

        it('TC4: Sans token', async () => {
            const res = await request(app)
                .post('/api/accounts')
                .send({
                    accountType: 'CHECKING',
                    bankId: 1
                });
            
            expect(res.statusCode).toBe(401);
        });
    });

    describe('GET /api/accounts', () => {
        it('TC1: Liste des comptes reussie', async () => {
            const res = await request(app)
                .get('/api/accounts')
                .set('Authorization', `Bearer ${adminToken}`);
            
            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        it('TC2: Sans token', async () => {
            const res = await request(app)
                .get('/api/accounts');
            
            expect(res.statusCode).toBe(401);
        });
    });

    describe('GET /api/accounts/:number', () => {
        it('TC1: Detail compte reussi', async () => {
            const res = await request(app)
                .get(`/api/accounts/${accountId}`)
                .set('Authorization', `Bearer ${adminToken}`);
            
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('account_number');
        });

        it('TC2: Compte non trouve', async () => {
            const res = await request(app)
                .get('/api/accounts/999')
                .set('Authorization', `Bearer ${adminToken}`);
            
            expect(res.statusCode).toBe(404);
        });
    });
});

// ============================================================================
// 3. DEPOT EXTERNE
// ============================================================================

describe('3. DEPOT EXTERNE', () => {

    // Avant le dépôt, créer un compte source pour tester
    beforeAll(async () => {
        const res = await request(app)
            .post('/api/accounts')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                accountType: 'SAVINGS',
                bankId: 2,
                initialBalance: 50000
            });
        sourceAccountId = res.body.account.id;
    });

    describe('POST /api/accounts/deposit', () => {
        it('TC1: Depot externe reussi', async () => {
            const res = await request(app)
                .post('/api/accounts/deposit')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    accountId: accountId,
                    amount: 10000,
                    sourceBankId: 2,
                    sourceAccountNumber: 'ACC-87654321'
                });
            
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('reference');
        });

        it('TC2: Compte destination non trouve', async () => {
            const res = await request(app)
                .post('/api/accounts/deposit')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    accountId: 999,
                    amount: 10000,
                    sourceBankId: 2,
                    sourceAccountNumber: 'ACC-87654321'
                });
            
            expect(res.statusCode).toBe(404);
        });

        it('TC3: Compte destination bloque', async () => {
            // D'abord bloquer le compte
            await request(app)
                .put(`/api/accounts/${accountId}/block`)
                .set('Authorization', `Bearer ${adminToken}`);

            const res = await request(app)
                .post('/api/accounts/deposit')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    accountId: accountId,
                    amount: 10000,
                    sourceBankId: 2,
                    sourceAccountNumber: 'ACC-87654321'
                });
            
            expect(res.statusCode).toBe(403);
        });

        it('TC4: Plafond depasse', async () => {
            const res = await request(app)
                .post('/api/accounts/deposit')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    accountId: accountId,
                    amount: 150000000,
                    sourceBankId: 2,
                    sourceAccountNumber: 'ACC-87654321'
                });
            
            expect(res.statusCode).toBe(400);
        });

        it('TC5: Banque source non trouvee', async () => {
            const res = await request(app)
                .post('/api/accounts/deposit')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    accountId: accountId,
                    amount: 10000,
                    sourceBankId: 999,
                    sourceAccountNumber: 'ACC-87654321'
                });
            
            expect(res.statusCode).toBe(404);
        });

        it('TC6: Compte source non trouve', async () => {
            const res = await request(app)
                .post('/api/accounts/deposit')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    accountId: accountId,
                    amount: 10000,
                    sourceBankId: 2,
                    sourceAccountNumber: 'INVALID'
                });
            
            expect(res.statusCode).toBe(404);
        });

        it('TC7: Solde source insuffisant', async () => {
            const res = await request(app)
                .post('/api/accounts/deposit')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    accountId: accountId,
                    amount: 100000,
                    sourceBankId: 2,
                    sourceAccountNumber: 'ACC-87654321'
                });
            
            expect(res.statusCode).toBe(400);
        });
    });
});

// ============================================================================
// 4. RETRAIT
// ============================================================================

describe('4. RETRAIT', () => {

    describe('POST /api/transactions/withdraw', () => {
        it('TC1: Retrait reussi', async () => {
            const res = await request(app)
                .post('/api/transactions/withdraw')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    accountId: accountId,
                    amount: 1000
                });
            
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('reference');
        });

        it('TC2: Compte non trouve', async () => {
            const res = await request(app)
                .post('/api/transactions/withdraw')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    accountId: 999,
                    amount: 1000
                });
            
            expect(res.statusCode).toBe(404);
        });

        it('TC3: Solde insuffisant', async () => {
            const res = await request(app)
                .post('/api/transactions/withdraw')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    accountId: accountId,
                    amount: 99999999
                });
            
            expect(res.statusCode).toBe(400);
        });

        it('TC4: Montant invalide', async () => {
            const res = await request(app)
                .post('/api/transactions/withdraw')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    accountId: accountId,
                    amount: -100
                });
            
            expect(res.statusCode).toBe(400);
        });
    });
});

// ============================================================================
// 5. TRANSFERT
// ============================================================================

describe('5. TRANSFERT', () => {

    let secondAccountId;

    beforeAll(async () => {
        const res = await request(app)
            .post('/api/accounts')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
                accountType: 'SAVINGS',
                bankId: 1,
                initialBalance: 5000
            });
        secondAccountId = res.body.account.id;
    });

    describe('POST /api/transactions/transfer', () => {
        it('TC1: Transfert reussi', async () => {
            const res = await request(app)
                .post('/api/transactions/transfer')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    fromAccountId: accountId,
                    toAccountId: secondAccountId,
                    amount: 500
                });
            
            expect(res.statusCode).toBe(200);
        });

        it('TC2: Même compte', async () => {
            const res = await request(app)
                .post('/api/transactions/transfer')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    fromAccountId: accountId,
                    toAccountId: accountId,
                    amount: 500
                });
            
            expect(res.statusCode).toBe(400);
        });

        it('TC3: Compte source non trouve', async () => {
            const res = await request(app)
                .post('/api/transactions/transfer')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    fromAccountId: 999,
                    toAccountId: secondAccountId,
                    amount: 500
                });
            
            expect(res.statusCode).toBe(404);
        });

        it('TC4: Compte destination non trouve', async () => {
            const res = await request(app)
                .post('/api/transactions/transfer')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    fromAccountId: accountId,
                    toAccountId: 999,
                    amount: 500
                });
            
            expect(res.statusCode).toBe(404);
        });

        it('TC5: Solde insuffisant', async () => {
            const res = await request(app)
                .post('/api/transactions/transfer')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    fromAccountId: accountId,
                    toAccountId: secondAccountId,
                    amount: 99999999
                });
            
            expect(res.statusCode).toBe(400);
        });
    });
});

// ============================================================================
// 6. VIREMENT EXTERNE
// ============================================================================

describe('6. VIREMENT EXTERNE', () => {

    let externalAccountId;

    beforeAll(async () => {
        // Créer un compte externe (compte d'un autre utilisateur)
        // D'abord créer un autre utilisateur
        const userRes = await request(app)
            .post('/api/register')
            .send({
                name: 'User Externe',
                email: `externe_${Date.now()}@test.com`,
                phone: '0612345679',
                password: 'password123'
            });
        
        const externalToken = userRes.body.token;

        // Créer un compte pour cet utilisateur
        const accRes = await request(app)
            .post('/api/accounts')
            .set('Authorization', `Bearer ${externalToken}`)
            .send({
                accountType: 'CHECKING',
                bankId: 2,
                initialBalance: 10000
            });
        externalAccountId = accRes.body.account.id;
    });

    describe('POST /api/transactions/external', () => {
        it('TC1: Virement externe reussi', async () => {
            const res = await request(app)
                .post('/api/transactions/external')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    fromAccountId: accountId,
                    toBankId: 2,
                    toAccountNumber: 'ACC-87654321',
                    amount: 1000
                });
            
            expect(res.statusCode).toBe(200);
        });

        it('TC2: Compte source non trouve', async () => {
            const res = await request(app)
                .post('/api/transactions/external')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    fromAccountId: 999,
                    toBankId: 2,
                    toAccountNumber: 'ACC-87654321',
                    amount: 1000
                });
            
            expect(res.statusCode).toBe(404);
        });

        it('TC3: Banque destination non trouvee', async () => {
            const res = await request(app)
                .post('/api/transactions/external')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    fromAccountId: accountId,
                    toBankId: 999,
                    toAccountNumber: 'ACC-87654321',
                    amount: 1000
                });
            
            expect(res.statusCode).toBe(404);
        });

        it('TC4: Compte destination non trouve', async () => {
            const res = await request(app)
                .post('/api/transactions/external')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    fromAccountId: accountId,
                    toBankId: 2,
                    toAccountNumber: 'INVALID',
                    amount: 1000
                });
            
            expect(res.statusCode).toBe(404);
        });

        it('TC5: Compte personnel', async () => {
            // Utiliser le compte de l'admin comme destination
            const res = await request(app)
                .post('/api/transactions/external')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    fromAccountId: accountId,
                    toBankId: 1,
                    toAccountNumber: 'ACC-12345678',
                    amount: 1000
                });
            
            expect(res.statusCode).toBe(400);
        });

        it('TC6: Solde insuffisant', async () => {
            const res = await request(app)
                .post('/api/transactions/external')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    fromAccountId: accountId,
                    toBankId: 2,
                    toAccountNumber: 'ACC-87654321',
                    amount: 99999999
                });
            
            expect(res.statusCode).toBe(400);
        });
    });
});

// ============================================================================
// 7. GESTION DES BANQUES
// ============================================================================

describe('7. GESTION DES BANQUES', () => {

    describe('GET /api/banks', () => {
        it('TC1: Liste des banques reussie', async () => {
            const res = await request(app)
                .get('/api/banks');
            
            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
        });
    });

    describe('GET /api/banks/:id', () => {
        it('TC1: Detail banque reussi', async () => {
            const res = await request(app)
                .get('/api/banks/1');
            
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('name');
        });

        it('TC2: Banque non trouvee', async () => {
            const res = await request(app)
                .get('/api/banks/999');
            
            expect(res.statusCode).toBe(404);
        });
    });

    describe('POST /api/banks (Admin)', () => {
        it('TC1: Ajout banque reussi', async () => {
            const res = await request(app)
                .post('/api/banks')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'Banque Test',
                    code: 'BTST'
                });
            
            expect(res.statusCode).toBe(201);
        });

        it('TC2: Banque deja existante', async () => {
            const res = await request(app)
                .post('/api/banks')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'BNP Paribas',
                    code: 'BNPP'
                });
            
            expect(res.statusCode).toBe(409);
        });

        it('TC3: Sans token', async () => {
            const res = await request(app)
                .post('/api/banks')
                .send({
                    name: 'Banque Test',
                    code: 'BTST'
                });
            
            expect(res.statusCode).toBe(401);
        });
    });

    describe('DELETE /api/banks/:id (Admin)', () => {
        it('TC1: Suppression banque reussie', async () => {
            // D'abord créer une banque
            const createRes = await request(app)
                .post('/api/banks')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'Banque A Supprimer',
                    code: 'BSUP'
                });
            
            const bankId = createRes.body.bank.id;

            const res = await request(app)
                .delete(`/api/banks/${bankId}`)
                .set('Authorization', `Bearer ${adminToken}`);
            
            expect(res.statusCode).toBe(204);
        });

        it('TC2: Banque non trouvee', async () => {
            const res = await request(app)
                .delete('/api/banks/999')
                .set('Authorization', `Bearer ${adminToken}`);
            
            expect(res.statusCode).toBe(404);
        });
    });
});

// ============================================================================
// 8. VERIFICATION DE COMPTE
// ============================================================================

describe('8. VERIFICATION DE COMPTE', () => {

    describe('POST /api/accounts/check', () => {
        it('TC1: Verification compte reussie', async () => {
            const res = await request(app)
                .post('/api/accounts/check')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    bankId: 2,
                    accountNumber: 'ACC-87654321'
                });
            
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('user_name');
        });

        it('TC2: Banque non trouvee', async () => {
            const res = await request(app)
                .post('/api/accounts/check')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    bankId: 999,
                    accountNumber: 'ACC-87654321'
                });
            
            expect(res.statusCode).toBe(404);
        });

        it('TC3: Compte non trouve', async () => {
            const res = await request(app)
                .post('/api/accounts/check')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    bankId: 2,
                    accountNumber: 'INVALID'
                });
            
            expect(res.statusCode).toBe(404);
        });

        it('TC4: Compte personnel', async () => {
            const res = await request(app)
                .post('/api/accounts/check')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    bankId: 1,
                    accountNumber: 'ACC-12345678'
                });
            
            expect(res.statusCode).toBe(400);
        });
    });
});

// ============================================================================
// 9. PROFIL UTILISATEUR
// ============================================================================

describe('9. PROFIL UTILISATEUR', () => {

    describe('GET /api/profile', () => {
        it('TC1: Profil reussi', async () => {
            const res = await request(app)
                .get('/api/profile')
                .set('Authorization', `Bearer ${adminToken}`);
            
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('email', 'admin@banque.com');
        });

        it('TC2: Sans token', async () => {
            const res = await request(app)
                .get('/api/profile');
            
            expect(res.statusCode).toBe(401);
        });
    });

    describe('PUT /api/profile', () => {
        it('TC1: Mise a jour profil reussie', async () => {
            const res = await request(app)
                .put('/api/profile')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'Admin Systeme'
                });
            
            expect(res.statusCode).toBe(200);
            expect(res.body.user).toHaveProperty('name', 'Admin Systeme');
        });

        it('TC2: Telephone deja utilise', async () => {
            const res = await request(app)
                .put('/api/profile')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    phone: '0612345678' // déjà utilisé par l'utilisateur test
                });
            
            expect(res.statusCode).toBe(409);
        });
    });
});

// ============================================================================
// 10. DÉCONNEXION
// ============================================================================

describe('10. DECONNEXION', () => {

    describe('POST /api/logout', () => {
        it('TC1: Deconnexion reussie', async () => {
            const res = await request(app)
                .post('/api/logout')
                .set('Authorization', `Bearer ${adminToken}`);
            
            expect(res.statusCode).toBe(200);
        });

        it('TC2: Sans token', async () => {
            const res = await request(app)
                .post('/api/logout');
            
            expect(res.statusCode).toBe(401);
        });
    });
});
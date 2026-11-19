# Banque UY1: full-stack banking app

A banking web application with a Node.js backend and a Vue.js frontend, built for the INF352 course at the University of Yaoundé I. It follows the Spring Boot version in [banking-app-testing](https://github.com/oberlinkeyanfe-ops/banking-app-testing).

Version française plus bas.

## Features

- Sign up and log in with JWT
- Checking and savings accounts
- External deposit, withdrawal
- Transfer between accounts and external transfer
- Admin panel

## Tech stack

| Part | Tools |
|---|---|
| Backend (`backend/`) | Node.js, Express, SQLite, JWT, bcrypt |
| Frontend (`banking-app/`) | Vue 3, Vite, Pinia, Vue Router |
| Tests | Vitest on both sides |
| Deployment | Render |

The `CFG/` folder contains the control flow graphs used to design the tests.

## Run it locally

Backend:

```bash
cd backend
npm install
npm run dev
```

Frontend, in another terminal:

```bash
cd banking-app
npm install
npm run dev
```

Tests:

```bash
cd backend && npm test
cd banking-app && npm test
```

---

## Version française

Application bancaire web avec un backend Node.js/Express/SQLite et un frontend Vue 3/Pinia, réalisée pour le cours INF352 à l'Université de Yaoundé I. Fonctionnalités : authentification JWT, comptes courant et épargne, dépôts, retraits, virements internes et externes, panneau d'administration. Les tests sont écrits avec Vitest.

Pour lancer : `npm install` puis `npm run dev` dans `backend/`, puis la même chose dans `banking-app/`.

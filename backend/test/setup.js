// backend/test/setup.js
import { beforeAll, afterAll } from 'vitest';
import app from '../index.js';

// Avant tous les tests
beforeAll(async () => {
  console.log('🧪 Démarrage des tests...');
});

// Après tous les tests
afterAll(async () => {
  console.log('✅ Tests terminés');
});
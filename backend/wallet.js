import fs from 'fs/promises';
import path from 'path';
import logger from './logger.js';

const DATA_FILE = path.join(process.cwd(), 'collector', 'data', 'virtual_wallets.json');

let store = { wallets: {} };

// simple per-user lock to avoid races in file write
const locks = new Map();

async function load()
{

  try {
    const txt = await fs.readFile(DATA_FILE, 'utf8');
    store = JSON.parse(txt);
    logger.debug('[WALLET] loaded store from file', { path: DATA_FILE });
  } catch (e) {
    store = { wallets: {} };
    logger.info('[WALLET] no existing store, starting fresh', { path: DATA_FILE });
  }

}

async function save()
{

  try {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
    logger.debug('[WALLET] store saved', { path: DATA_FILE });
  } catch (e) {
    logger.error('[WALLET] save failed', { err: e && (e.message || String(e)) });
  }

}

function ensureWallet(userId)

{

  if (!store.wallets[userId])

  {

    store.wallets[userId] = { cash: 10000, holdings: {}, history: [] };

  }

  return store.wallets[userId];

}

function acquireLock(userId)

{

  const p = locks.get(userId) || Promise.resolve();

  let release;

  const np = new Promise((res) => { release = res; });

  locks.set(userId, p.then(() => np));

  return release;

}

export async function getWalletFor(userId)

{

  await load();

  return ensureWallet(userId);

}

export async function createWalletFor(userId, initialCash = 10000)

{

  const release = acquireLock(userId);

  try

  {

    await load();

    store.wallets[userId] = { cash: Number(initialCash), holdings: {}, history: [] };

    await save();

    return store.wallets[userId];

  }

  finally

  {

    release();

  }

}

export async function recordTrade(userId, trade)

{

  const release = acquireLock(userId);

  try

  {

    await load();
    const w = ensureWallet(userId);
    const { symbol, side, qty, priceUsd, amountUsd } = trade;
    const now = Date.now();
    logger.info('[WALLET] recordTrade start', { userId, symbol, side, qty, priceUsd, amountUsd });
    // validations
    if (!symbol || !side || !amountUsd || !priceUsd) {
      logger.warn('[WALLET] invalid trade params', { userId, trade });
      throw new Error('invalid trade');
    }
    if (side === 'buy') {
      if (w.cash < amountUsd) {
        logger.warn('[WALLET] insufficient cash', { userId, have: w.cash, need: amountUsd });
        throw new Error('insufficient cash');
      }
      w.cash = Number((w.cash - amountUsd).toFixed(8));
      w.holdings[symbol] = (w.holdings[symbol] || 0) + qty;
    } else {
      const have = w.holdings[symbol] || 0;
      if (have < qty) {
        logger.warn('[WALLET] insufficient holdings', { userId, symbol, have, need: qty });
        throw new Error('insufficient holdings');
      }
      w.cash = Number((w.cash + amountUsd).toFixed(8));
      w.holdings[symbol] = Math.max(0, have - qty);
    }
    const rec = { id: `t-${now}-${Math.floor(Math.random()*10000)}`, symbol, side, qty, priceUsd, amountUsd, createdAt: now };
    w.history.unshift(rec);
    await save();
    logger.info('[WALLET] recordTrade done', { userId, tradeId: rec.id });
    return rec;

  }

  finally

  {

    release();

  }

}

export async function getWalletValue(userId, priceMap)

{

  await load();

  const w = ensureWallet(userId);

  logger.debug('[WALLET] getWalletValue', { userId, priceMapKeys: Object.keys(priceMap || {}) });
  let value = Number(w.cash) || 0;

  for (const s of Object.keys(w.holdings))

  {

    const qty = Number(w.holdings[s]) || 0;

    const p = priceMap && priceMap[s] ? Number(priceMap[s]) : 0;

    value += qty * p;

  }
  logger.debug('[WALLET] computed value', { userId, value });
  return { cash: w.cash, holdings: w.holdings, value };

}

export async function getHistory(userId)

{

  await load();

  const w = ensureWallet(userId);

  return w.history || [];

}

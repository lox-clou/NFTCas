// language: JavaScript, target: Telegram Web App (see.tg)
// *инициализация WebApp, 4 игры, NFT-маркет, профиль, haptic*

const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); tg.setHeaderColor?.('#0b0d12'); }

const state = {
  balance: parseFloat(localStorage.getItem('vanta_bal') || '10'),
  games: parseInt(localStorage.getItem('vanta_games') || '0'),
  wins: parseInt(localStorage.getItem('vanta_wins') || '0'),
  owned: JSON.parse(localStorage.getItem('vanta_nft') || '[]'),
  currentGame: null,
  crash: { running:false, mult:1, bet:0, interval:null }
};

const save = () => {
  localStorage.setItem('vanta_bal', state.balance.toFixed(2));
  localStorage.setItem('vanta_games', state.games);
  localStorage.setItem('vanta_wins', state.wins);
  localStorage.setItem('vanta_nft', JSON.stringify(state.owned));
};

const haptic = (type='light') => tg?.HapticFeedback?.impactOccurred?.(type);
const notify = (msg, ms=1800) => {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._tm); t._tm = setTimeout(()=>t.classList.remove('show'), ms);
};

const updateBalance = () => {
  document.getElementById('balance').textContent = state.balance.toFixed(2);
  const pb = document.getElementById('pBal'); if (pb) pb.textContent = state.balance.toFixed(2);
};
const updateProfile = () => {
  document.getElementById('pGames').textContent = state.games;
  document.getElementById('pWins').textContent = state.wins;
  document.getElementById('pNft').textContent = state.owned.length;
};

// tabs
document.querySelectorAll('.tab').forEach(t => {
  t.onclick = () => {
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    const v = t.dataset.view;
    document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('hidden', p.dataset.panel!==v));
    haptic('light');
  };
});

// profile init
if (tg?.initDataUnsafe?.user) {
  const u = tg.initDataUnsafe.user;
  document.getElementById('userName').textContent = u.first_name || 'игрок';
  const av = document.getElementById('avatar');
  av.textContent = (u.first_name||'?')[0].toUpperCase();
  if (u.photo_url) { av.style.backgroundImage = `url(${u.photo_url})`; av.style.backgroundSize='cover'; av.textContent=''; }
}

document.getElementById('depositBtn').onclick = () => {
  state.balance += 5; save(); updateBalance(); updateProfile();
  notify('+5 TON (демо)'); haptic('success');
};

// game cards
document.querySelectorAll('.game-card').forEach(c => {
  c.onclick = () => {
    haptic('light');
    state.currentGame = c.dataset.game;
    renderArena();
  };
});

const arena = () => document.getElementById('arena');

const betControls = (min=0.1) => `
  <div class="bet-row">
    <label>Ставка</label>
    <input class="bet-input" id="bet" type="number" step="0.1" min="${min}" value="0.5" />
    <div class="chip" data-mul="0.5">½</div>
    <div class="chip" data-mul="2">×2</div>
    <div class="chip" data-mul="max">MAX</div>
  </div>`;

const bindChips = () => {
  document.querySelectorAll('.chip').forEach(ch => {
    ch.onclick = () => {
      const inp = document.getElementById('bet');
      const v = parseFloat(inp.value) || 0;
      if (ch.dataset.mul === 'max') inp.value = state.balance.toFixed(2);
      else inp.value = Math.max(0.1, v * parseFloat(ch.dataset.mul)).toFixed(2);
      haptic('light');
    };
  });
};

const getBet = () => {
  const v = parseFloat(document.getElementById('bet').value);
  if (!v || v <= 0) { notify('укажи ставку'); return null; }
  if (v > state.balance) { notify('недостаточно TON'); return null; }
  return v;
};

const renderArena = () => {
  const g = state.currentGame;
  if (g === 'coin') {
    arena().innerHTML = `
      <h3 style="margin-bottom:8px">Coin Flip</h3>
      ${betControls()}
      <div class="coin" id="coin">?</div>
      <div class="choice-row">
        <button class="btn" id="heads">Орёл</button>
        <button class="btn" id="tails">Решка</button>
      </div>
      <div id="res"></div>`;
    bindChips();
    const flip = (pick) => {
      const bet = getBet(); if (!bet) return;
      state.balance -= bet; state.games++; save(); updateBalance(); updateProfile();
      const coin = document.getElementById('coin');
      coin.classList.add('flip');
      document.getElementById('res').innerHTML = '';
      haptic('medium');
      setTimeout(() => {
        const outcome = Math.random() < .5 ? 'heads' : 'tails';
        coin.textContent = outcome === 'heads' ? 'О' : 'Р';
        coin.classList.remove('flip');
        const res = document.getElementById('res');
        if (outcome === pick) {
          const win = bet * 1.95;
          state.balance += win; state.wins++;
          res.innerHTML = `<div class="result win">выигрыш +${win.toFixed(2)} TON</div>`;
          haptic('success');
        } else {
          res.innerHTML = `<div class="result lose">проигрыш −${bet.toFixed(2)} TON</div>`;
          haptic('error');
        }
        save(); updateBalance(); updateProfile();
      }, 1000);
    };
    document.getElementById('heads').onclick = () => flip('heads');
    document.getElementById('tails').onclick = () => flip('tails');
  }

  if (g === 'dice') {
    arena().innerHTML = `
      <h3 style="margin-bottom:8px">Dice · угадай число</h3>
      ${betControls()}
      <div class="bet-row">
        <label>Цель (1-6, выплата x(6/n))</label>
        <input class="bet-input" id="target" type="number" min="1" max="6" value="6" />
      </div>
      <div class="dice-display"><div class="die" id="die">?</div></div>
      <button class="btn" id="roll">Бросить</button>
      <div id="res"></div>`;
    bindChips();
    document.getElementById('roll').onclick = () => {
      const bet = getBet(); if (!bet) return;
      const tgt = parseInt(document.getElementById('target').value);
      if (!tgt || tgt<1 || tgt>6) { notify('цель 1-6'); return; }
      state.balance -= bet; state.games++; save(); updateBalance(); updateProfile();
      const die = document.getElementById('die');
      die.classList.add('roll');
      haptic('medium');
      setTimeout(() => {
        const r = Math.floor(Math.random()*6)+1;
        die.textContent = r; die.classList.remove('roll');
        const res = document.getElementById('res');
        if (r === tgt) {
          const mul = 6/tgt * 0.95;
          const win = bet * mul;
          state.balance += win; state.wins++;
          res.innerHTML = `<div class="result win">угадал! +${win.toFixed(2)} TON (x${mul.toFixed(2)})</div>`;
          haptic('success');
        } else {
          res.innerHTML = `<div class="result lose">выпало ${r}. −${bet.toFixed(2)} TON</div>`;
          haptic('error');
        }
        save(); updateBalance(); updateProfile();
      }, 600);
    };
  }

  if (g === 'slots') {
    const symbols = ['🍒','🍋','🔔','⭐','💎','7️⃣'];
    arena().innerHTML = `
      <h3 style="margin-bottom:8px">Slots</h3>
      ${betControls()}
      <div class="slots">
        <div class="reel" id="r0">?</div>
        <div class="reel" id="r1">?</div>
        <div class="reel" id="r2">?</div>
      </div>
      <button class="btn" id="spin">Крутить</button>
      <div id="res"></div>`;
    bindChips();
    document.getElementById('spin').onclick = () => {
      const bet = getBet(); if (!bet) return;
      state.balance -= bet; state.games++; save(); updateBalance(); updateProfile();
      const reels = [document.getElementById('r0'),document.getElementById('r1'),document.getElementById('r2')];
      reels.forEach(r=>r.classList.add('spin'));
      haptic('medium');
      const result = [0,1,2].map(()=>symbols[Math.floor(Math.random()*symbols.length)]);
      reels.forEach((r,i)=>{
        setTimeout(()=>{
          r.classList.remove('spin');
          r.textContent = result[i];
          if (i===2) evaluate();
        }, 500 + i*300);
      });
      const evaluate = () => {
        const res = document.getElementById('res');
        const [a,b,c] = result;
        let mul = 0, label = '';
        if (a===b && b===c) {
          mul = a==='💎'?50 : a==='7️⃣'?25 : a==='⭐'?15 : a==='🔔'?10 : 5;
          label = `джекпот ${a}${a}${a}`;
        } else if (a===b || b===c || a===c) {
          mul = 1.5; label = 'пара';
        }
        if (mul > 0) {
          const win = bet * mul;
          state.balance += win; state.wins++;
          res.innerHTML = `<div class="result win">${label} · +${win.toFixed(2)} TON (x${mul})</div>`;
          haptic('success');
        } else {
          res.innerHTML = `<div class="result lose">−${bet.toFixed(2)} TON</div>`;
          haptic('error');
        }
        save(); updateBalance(); updateProfile();
      };
    };
  }

  if (g === 'crash') {
    arena().innerHTML = `
      <h3 style="margin-bottom:8px">Crash</h3>
      ${betControls()}
      <div class="crash-display" id="crashDisp">1.00×</div>
      <div class="choice-row">
        <button class="btn good" id="startCrash">Старт</button>
        <button class="btn bad" id="cashout" disabled>Забрать</button>
      </div>
      <div id="res"></div>`;
    bindChips();
    const disp = document.getElementById('crashDisp');
    const startBtn = document.getElementById('startCrash');
    const cashBtn = document.getElementById('cashout');
    const res = document.getElementById('res');

    startBtn.onclick = () => {
      const bet = getBet(); if (!bet) return;
      state.balance -= bet; state.games++; save(); updateBalance(); updateProfile();
      state.crash = { running:true, mult:1, bet, crashAt: 1 + Math.random()*Math.random()*9, interval:null };
      startBtn.disabled = true; cashBtn.disabled = false; res.innerHTML = '';
      disp.classList.remove('boom');
      haptic('medium');
      state.crash.interval = setInterval(()=>{
        state.crash.mult += 0.02 + state.crash.mult*0.008;
        disp.textContent = state.crash.mult.toFixed(2)+'×';
        if (state.crash.mult >= state.crash.crashAt) {
          clearInterval(state.crash.interval);
          state.crash.running = false;
          disp.textContent = 'CRASH @'+state.crash.crashAt.toFixed(2)+'×';
          disp.classList.add('boom');
          res.innerHTML = `<div class="result lose">крах · −${bet.toFixed(2)} TON</div>`;
          haptic('error');
          startBtn.disabled = false; cashBtn.disabled = true;
        }
      }, 60);
    };

    cashBtn.onclick = () => {
      if (!state.crash.running) return;
      clearInterval(state.crash.interval);
      state.crash.running = false;
      const win = state.crash.bet * state.crash.mult * 0.97;
      state.balance += win; state.wins++;
      res.innerHTML = `<div class="result win">забрал @${state.crash.mult.toFixed(2)}× · +${win.toFixed(2)} TON</div>`;
      haptic('success');
      save(); updateBalance(); updateProfile();
      startBtn.disabled = false; cashBtn.disabled = true;
    };
  }
};

// NFT
const NFT_COLLECTION = [
  {id:'v001', name:'Vanta Shard #001', art:'◆', bg:'linear-gradient(135deg,#7c5cff,#22d3ee)', price:2.5, rarity:'legendary'},
  {id:'v002', name:'Neon Fox #042', art:'🦊', bg:'linear-gradient(135deg,#f59e0b,#ef4444)', price:1.2, rarity:'epic'},
  {id:'v003', name:'Cyber Skull #108', art:'💀', bg:'linear-gradient(135deg,#22d3ee,#0b0d12)', price:0.8, rarity:'rare'},
  {id:'v004', name:'Lucky 7 #777', art:'7️⃣', bg:'linear-gradient(135deg,#f5c451,#b8860b)', price:5.0, rarity:'legendary'},
  {id:'v005', name:'Pixel Gem #023', art:'💎', bg:'linear-gradient(135deg,#a78bfa,#7c5cff)', price:0.4, rarity:'common'},
  {id:'v006', name:'Void Cat #333', art:'🐈‍⬛', bg:'linear-gradient(135deg,#1b2030,#7c5cff)', price:1.8, rarity:'epic'},
];

const renderNft = () => {
  const grid = document.getElementById('nftGrid');
  grid.innerHTML = NFT_COLLECTION.map(n => `
    <div class="nft-card" data-id="${n.id}">
      <div class="nft-art" style="background:${n.bg}">
        <span class="rarity ${n.rarity}">${n.rarity}</span>
        ${n.art}
      </div>
      <div class="nft-info">
        <h4>${n.name}</h4>
        <div class="price">◈ ${n.price} TON</div>
        <div class="owner">${state.owned.includes(n.id)?'✓ в коллекции':'доступно'}</div>
      </div>
    </div>`).join('');

  grid.querySelectorAll('.nft-card').forEach(c => {
    c.onclick = () => {
      const n = NFT_COLLECTION.find(x=>x.id===c.dataset.id);
      if (state.owned.includes(n.id)) { notify('уже в коллекции'); return; }
      if (state.balance < n.price) { notify('недостаточно TON'); haptic('error'); return; }
      state.balance -= n.price;
      state.owned.push(n.id);
      save(); updateBalance(); updateProfile(); renderNft(); renderMyNft();
      notify(`куплен ${n.name}`); haptic('success');
    };
  });

  renderMyNft();
};

const renderMyNft = () => {
  const my = document.getElementById('myNft');
  if (!state.owned.length) { my.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:12px">пусто — купи первый NFT</div>'; return; }
  my.innerHTML = state.owned.map(id => {
    const n = NFT_COLLECTION.find(x=>x.id===id); if (!n) return '';
    return `<div class="nft-card">
      <div class="nft-art" style="background:${n.bg}"><span class="rarity ${n.rarity}">${n.rarity}</span>${n.art}</div>
      <div class="nft-info"><h4>${n.name}</h4><div class="owner">твой</div></div>
    </div>`;
  }).join('');
};

renderNft();
updateBalance();
updateProfile();

const LOCALSTORAGE_KEY = 'xrb_wallets';

class App {
  constructor(element, wallet) {
    this.element = element;
    this.wallet = wallet || null;
    this.selectedAccount = 0; // Index of added accounts, not all wallet accounts
    this.mode = null;
    this.walletName = null; // For localStorage
    this.walletPassword = null;

    // Views are contained in separate files
    this.views = Object.keys(window.views).reduce((out, cur) => {
      out[cur] = window.views[cur].bind(this);
      return out;
    }, {});

    this.render(this.wallet ? null : this.views.signIn());

    document.addEventListener('keyup', e => {
      if(e.code === 'Escape') this.render();
    });
  }
  render(mode) {
    this.mode = mode || null;
    // Reset root element
    while(this.element.firstChild)
      this.element.removeChild(this.element.firstChild);

    if(this.mode !== null) {
      this.element.appendChild(this.mode);
    } else {
      this.element.appendChild(this.views.dashboard());
    }
  }
  listWalletNames() {
    const wallets = LOCALSTORAGE_KEY in localStorage ? JSON.parse(localStorage[LOCALSTORAGE_KEY]) : {};
    return Object.keys(wallets);
  }
  saveWallet() {
    const salt = nacl.randomBytes(16);
    const pw = new TextEncoder().encode(this.walletPassword);
    const hashInput = new Uint8Array(salt.length + pw.length);
    hashInput.set(salt, 0);
    hashInput.set(pw, salt.length);
    const hash = nacl.hash(hashInput);

    const nonce = hash.slice(0, 24);
    const key = hash.slice(24, 56);
    const json = new TextEncoder().encode(JSON.stringify(this.wallet));

    const box = nacl.secretbox(json, nonce, key);

    const wallets = LOCALSTORAGE_KEY in localStorage ? JSON.parse(localStorage[LOCALSTORAGE_KEY]) : {};
    wallets[this.walletName] = { salt: uint8_b64(salt), box: uint8_b64(box) };
    localStorage[LOCALSTORAGE_KEY] = JSON.stringify(wallets);
  }
  removeWallet(original, newName) {
    const wallets = LOCALSTORAGE_KEY in localStorage ? JSON.parse(localStorage[LOCALSTORAGE_KEY]) : {};
    if(!(this.walletName in wallets))
      throw new Error('INVALID_WALLET');

    if(newName)
      wallets[newName] = wallets[original];
    delete wallets[original];

    localStorage[LOCALSTORAGE_KEY] = JSON.stringify(wallets);
  }
  loadWallet() {
    const wallets = LOCALSTORAGE_KEY in localStorage ? JSON.parse(localStorage[LOCALSTORAGE_KEY]) : {};
    if(!(this.walletName in wallets))
      throw new Error('INVALID_WALLET');

    const data = wallets[this.walletName];

    const salt = b64_uint8(data.salt);
    const pw = new TextEncoder().encode(this.walletPassword);
    const hashInput = new Uint8Array(salt.length + pw.length);
    hashInput.set(salt, 0);
    hashInput.set(pw, salt.length);
    const hash = nacl.hash(hashInput);

    const nonce = hash.slice(0, 24);
    const key = hash.slice(24, 56);
    const box = b64_uint8(data.box);
    const open = nacl.secretbox.open(box, nonce, key);

    this.wallet = new Wallet(this, JSON.parse(new TextDecoder().decode(open)));
  }
}

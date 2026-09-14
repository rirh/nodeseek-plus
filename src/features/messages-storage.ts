export type Message = { id?: number; max_id?: number; local_id?: string; after_id?: number; sender_id: number; receiver_id: number; sender_name?: string; receiver_name?: string; content: string; created_at: string; viewed?: number | boolean; is_markdown?: number | boolean };
export type Conversation = { id: number; name: string; latest: Message; unread: boolean };
type SavedMessage = { account: number; peer: number; key: string; message: Message };
type SavedConversation = Conversation & { account: number };
const timestamp = (message: Message) => Date.parse(message.created_at) || 0;
const serverId = (message: Message) => message.id ?? message.max_id;
const messageKey = (message: Message) => serverId(message) !== undefined ? `server:${serverId(message)}` : message.local_id ? `local:${message.local_id}` : `content:${JSON.stringify([message.sender_id, message.receiver_id, message.created_at, message.content])}`;

export function mergeMessages(previous: Message[], incoming: Message[]): Message[] {
  const result = new Map(previous.map(message => [messageKey(message), message]));
  for (const message of incoming) {
    const key = messageKey(message), id = serverId(message);
    if (id !== undefined && !result.has(key)) {
      // Reconcile one acknowledged local echo with one newly received server message.
      const echo = [...result.entries()].find(([, row]) => row.local_id && serverId(row) === undefined && id > (row.after_id || 0)
        && row.sender_id === message.sender_id && row.receiver_id === message.receiver_id && row.content === message.content
        && Math.abs(timestamp(row) - timestamp(message)) < 300000);
      if (echo) result.delete(echo[0]);
    }
    const fields = Object.fromEntries(Object.entries(message).filter(([, value]) => value !== undefined));
    result.set(key, { ...result.get(key), ...fields } as Message);
  }
  return [...result.values()].sort((a, b) => timestamp(a) - timestamp(b) || (serverId(a) || 0) - (serverId(b) || 0));
}

export function createMessageArchive(account: number) {
  let opening: Promise<IDBDatabase> | undefined, closed = false;
  function database() {
    return opening ||= new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('nspp-message-archive', 1);
      request.onupgradeneeded = () => {
        const messages = request.result.createObjectStore('messages', { keyPath: ['account', 'peer', 'key'] });
        messages.createIndex('thread', ['account', 'peer']);
        const contacts = request.result.createObjectStore('contacts', { keyPath: ['account', 'id'] });
        contacts.createIndex('account', 'account');
      };
      request.onsuccess = () => {
        if (closed) { request.result.close(); reject(new Error('存档已关闭')); return; }
        request.result.onversionchange = () => request.result.close(); resolve(request.result);
      };
      request.onerror = () => { opening = undefined; reject(new Error('本地消息存档不可用')); };
      request.onblocked = () => { reject(new Error('本地存档被其他页面占用，请关闭旧页面后重试')); };
    });
  }
  async function read<T>(store: string, index: string, key: IDBValidKey): Promise<T[]> {
    const db = await database();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(store, 'readonly');
      const request = transaction.objectStore(store).index(index).getAll(key);
      transaction.oncomplete = () => resolve(request.result as T[]);
      transaction.onabort = transaction.onerror = () => reject(new Error('读取本地消息存档失败'));
    });
  }
  const contacts = () => read<SavedConversation>('contacts', 'account', account);
  const messages = async (peer: number) => (await read<SavedMessage>('messages', 'thread', [account, peer])).map(row => row.message).sort((a, b) => timestamp(a) - timestamp(b) || (serverId(a) || 0) - (serverId(b) || 0));
  async function merge(peer: number, name: string | undefined, incoming: Message[], mark?: number[] | 'all'): Promise<Message[]> {
    const db = await database();
    return new Promise((resolve, reject) => {
      // The read/merge/write runs in one transaction, including across tabs.
      const transaction = db.transaction(['messages', 'contacts'], 'readwrite');
      const store = transaction.objectStore('messages'), peers = transaction.objectStore('contacts');
      const history = store.index('thread').getAll([account, peer]); const contact = peers.get([account, peer]);
      let ready = 0, merged: Message[] = [];
      const write = () => {
        if (++ready !== 2) return;
        const previous = (history.result as SavedMessage[]).map(row => row.message);
        const safe = incoming.filter(row => (row.sender_id === account && row.receiver_id === peer) || (row.sender_id === peer && row.receiver_id === account));
        merged = mergeMessages(previous, safe);
        if (mark) merged = merged.map(row => row.receiver_id === account && (mark === 'all' || mark.includes(serverId(row)!)) ? { ...row, viewed: true } : row);
        const keys = new Set(merged.map(messageKey));
        for (const row of history.result as SavedMessage[]) if (!keys.has(row.key)) store.delete([account, peer, row.key]);
        const oldMessages = new Map((history.result as SavedMessage[]).map(row => [row.key, JSON.stringify(row.message)]));
        for (const message of merged) {
          const key = messageKey(message);
          if (oldMessages.get(key) !== JSON.stringify(message)) store.put({ account, peer, key, message } satisfies SavedMessage);
        }
        const latest = merged.at(-1); const old = contact.result as SavedConversation | undefined;
        if (latest) peers.put({ account, id: peer, name: name || old?.name || `用户 ${peer}`, latest, unread: latest.receiver_id === account && (latest.viewed === 0 || latest.viewed === false) } satisfies SavedConversation);
      };
      history.onsuccess = write; contact.onsuccess = write;
      transaction.oncomplete = () => resolve(merged);
      transaction.onabort = transaction.onerror = () => reject(new Error('保存本地消息失败，请检查浏览器存储空间'));
    });
  }
  async function mergeList(rows: Message[]) {
    const groups = new Map<number, Message[]>();
    for (const row of rows) {
      if (row.sender_id !== account && row.receiver_id !== account) continue;
      const peer = row.sender_id === account ? row.receiver_id : row.sender_id;
      groups.set(peer, [...(groups.get(peer) || []), row]);
    }
    for (const [peer, rows] of groups) {
      const newest = rows.at(-1)!;
      await merge(peer, newest.sender_id === account ? newest.receiver_name : newest.sender_name, rows);
    }
    return contacts();
  }
  return { contacts, messages, merge, mergeList, close: () => { closed = true; void opening?.then(db => db.close()).catch(() => {}); } };
}

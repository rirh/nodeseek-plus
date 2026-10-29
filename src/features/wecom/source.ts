// What the conversation pane and the columns need from a forum. NodeSeek, linux.do and V2EX each implement these.
import type { Floor, PostPage, PostTarget } from './parse';

/** A count under a message bubble, such as likes or thanks. */
export interface Chip { title: string; count: number; on: boolean; icon?: () => Element }

/** An entry in a message's right-click menu that acts on the site, such as 点赞 or 感谢. */
export interface FloorAction {
  label: string;
  detail?: string;
  disabled?: boolean;
  /** Actions that cost something ask first; the menu turns into this question with 取消 / 确定. */
  confirm?: () => Promise<string> | string;
  /** Rejects with the reason to show when the site refuses. */
  run(): Promise<void>;
}

export interface ThreadSource {
  /** The signed-in user; without one the input box stays disabled. */
  me: { id: number | string; name: string } | null;
  /** Markdown toolbar with image upload and preview; V2EX replies are plain text. */
  markdown: boolean;
  /** Status while a reply is on its way. */
  sending: string;
  href(id: number, page?: number, floor?: number | null): string;
  /** Links to this site's threads open in the pane instead of a new tab. */
  target(href: string): PostTarget | null;
  load(id: number, page: number, signal: AbortSignal): Promise<PostPage>;
  /** Finds the page that holds `target.floor` when the link does not say. */
  locate?(target: PostTarget, signal: AbortSignal): Promise<number>;
  /** Resolves with '' once the site accepted the reply, otherwise with the reason it did not. */
  reply(id: number, text: string, to: Floor | null): Promise<string>;
  /** Called after a reply was accepted, so the next load sees it. */
  replied?(id: number): void;
  chips(floor: Floor, page: PostPage): Chip[];
  actions(floor: Floor, page: PostPage): FloorAction[];
  mine(floor: Floor): boolean;
  /** Whether 回复 is offered on this floor (NodeSeek hides it on your own). */
  canReply(floor: Floor): boolean;
  mention(floor: Floor, href: string): string;
  quote(floor: Floor, href: string, text: string, id: number): string;
  /** The source text copied by 复制, when the site gives one. */
  source?(floor: Floor): string;
  /** Inline images that are not photos (stickers, emoji) and should not open the viewer. */
  sticker?(image: HTMLImageElement): boolean;
  /** NodeSeek++'s author, whose floors carry the 插件作者 tag. */
  author?(floor: Floor): boolean;
  destroy?(): void;
}

/** One row of the conversation list: a topic, a ranking entry or a notification. */
export interface Row {
  id: number;
  title: string;
  author: string;
  avatar: string;
  /** Second line, e.g. "category · last replier" or what a notification is about. */
  meta: string;
  time: Date | null;
  count: number | null;
  /** Where clicking the row opens the thread; floor null opens the start. */
  floor: number | null;
  page?: number;
  /** New replies since the last visit (linux.do), shown as a badge on the avatar. */
  unread?: number;
  pinned?: boolean;
  /** Notifications: unread ones get a dot; id is what marks them read. */
  read?: boolean;
  notice?: number;
}

export interface RowPage { rows: Row[]; next: string | null }

export interface Section { name: string; path: string; color?: string; depth?: number }

export interface SiteSource {
  name: string;
  /** Who is signed in, for the rail avatar; null shows the sign-in link. */
  user(): { name: string; avatar: string; profile: string } | null;
  signIn: string;
  compose: string;
  /** The list 帖子 opens. */
  home: string;
  /** The list for the page the user is on, or null when it is not a list or thread page. */
  route(url: URL): { list: string | null; topic: PostTarget | null } | null;
  list(path: string, signal: AbortSignal): Promise<RowPage>;
  /** Two orders the list can switch between, applied to the current list path. */
  sorts?: { label: string; apply(path: string): string; matches(path: string): boolean }[];
  sections(signal: AbortSignal): Promise<Section[]>;
  hot: { label: string; path: string }[];
  notices(signal: AbortSignal): Promise<RowPage>;
  /** Marks one notification read on the site, where the site needs that. */
  read?(row: Row): Promise<void>;
  /** Unread notification count from the page itself. */
  unread(): number;
  /** Refreshes the unread count from the site, for sites whose page does not update itself. */
  poll?(signal: AbortSignal): Promise<number>;
  /** Whether the site is in its dark theme. */
  dark(): boolean;
  thread: ThreadSource;
}

function count(value: unknown): number | null {
  if (typeof value !== 'number' && !(typeof value === 'string' && /^\d+$/.test(value))) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

export function discussionStats(root: ParentNode, postId: string) {
  const encoded = root.querySelector('#temp-script')?.textContent?.trim();
  if (!encoded) throw new Error('帖子数据不可用');
  const bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
  const data = JSON.parse(new TextDecoder().decode(bytes))?.postData;
  if (!data || String(data.postId) !== postId) throw new Error('帖子数据不匹配');
  const page = count(data.postPage), lastPage = count(data.postPageCount);
  const floors = Array.isArray(data.comments)
    ? data.comments.map((comment: { floorIndex?: unknown }) => count(comment?.floorIndex)).filter((floor: number | null): floor is number => floor !== null)
    : [];
  return {
    views: count(data.views),
    // The first page can include pinned comments from later pages. Only the final page gives the total.
    comments: page && page === lastPage && floors.length ? Math.max(...floors) : null,
    lastPage: lastPage && lastPage > 0 ? lastPage : null,
  };
}

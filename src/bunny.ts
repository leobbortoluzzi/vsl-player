export interface BunnyVideo {
  guid: string;
  title: string;
  status: number;
  length: number;
  thumbnailUrl: string;
  playlistUrl: string;
  videoPlayerUrl: string;
  storageSize: number;
  createdAt: string;
  updatedAt: string;
}

export interface BunnyCreateResponse {
  guid: string;
  title: string;
  status: number;
}

function bunnyUrl(libraryId: string, path: string): string {
  return `https://video.bunnycdn.com/library/${libraryId}${path}`;
}

function bunnyHeaders(apiKey: string): Record<string, string> {
  return {
    AccessKey: apiKey,
    'Content-Type': 'application/json',
  };
}

export async function createVideo(
  libraryId: string,
  apiKey: string,
  title: string,
): Promise<BunnyCreateResponse> {
  const res = await fetch(bunnyUrl(libraryId, '/videos'), {
    method: 'POST',
    headers: bunnyHeaders(apiKey),
    body: JSON.stringify({ title }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bunny createVideo failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<BunnyCreateResponse>;
}

export async function uploadVideo(
  libraryId: string,
  apiKey: string,
  guid: string,
  buffer: ArrayBuffer,
): Promise<void> {
  const res = await fetch(bunnyUrl(libraryId, `/videos/${guid}`), {
    method: 'PUT',
    headers: { AccessKey: apiKey },
    body: buffer,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bunny uploadVideo failed (${res.status}): ${text}`);
  }
}

export async function getVideo(
  libraryId: string,
  apiKey: string,
  guid: string,
): Promise<BunnyVideo> {
  const res = await fetch(bunnyUrl(libraryId, `/videos/${guid}`), {
    headers: { AccessKey: apiKey },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bunny getVideo failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<BunnyVideo>;
}

export async function deleteVideo(
  libraryId: string,
  apiKey: string,
  guid: string,
): Promise<void> {
  const res = await fetch(bunnyUrl(libraryId, `/videos/${guid}`), {
    method: 'DELETE',
    headers: { AccessKey: apiKey },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bunny deleteVideo failed (${res.status}): ${text}`);
  }
}

export async function listVideos(
  libraryId: string,
  apiKey: string,
): Promise<BunnyVideo[]> {
  const res = await fetch(bunnyUrl(libraryId, '/videos'), {
    headers: { AccessKey: apiKey },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bunny listVideos failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<BunnyVideo[]>;
}

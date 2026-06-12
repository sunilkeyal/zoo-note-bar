import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '@/lib/mongodb';
import { NoteUpdate } from '@/types';
import { ObjectId } from 'mongodb';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid note ID' });
  }

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return res.status(400).json({ success: false, error: 'Invalid note ID format' });
  }

  const db = await connectToDatabase();
  const collection = db.collection('notes');

  if (req.method === 'PUT') {
    const { title, content, folderId, position } = req.body as NoteUpdate;
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (title !== undefined) update.title = title.trim();
    if (content !== undefined) update.content = content;
    if (folderId !== undefined) update.folderId = folderId || null;
    if (position !== undefined) update.position = position;

    const result = await collection.findOneAndUpdate(
      { _id: objectId },
      { $set: update },
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    const note = {
      _id: result._id.toString(),
      title: result.title,
      content: result.content || '',
      folderId: result.folderId || undefined,
      position: result.position ?? 0,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
    };

    return res.status(200).json({ success: true, data: note });
  }

  if (req.method === 'DELETE') {
    const result = await collection.deleteOne({ _id: objectId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

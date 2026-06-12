import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '@/lib/mongodb';
import { Note, NoteInput } from '@/types';
import { ObjectId } from 'mongodb';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const db = await connectToDatabase();
  const collection = db.collection('notes');

  if (req.method === 'GET') {
    const notes = await collection
      .find({})
      .project({ title: 1, content: 1, folderId: 1, position: 1, createdAt: 1, updatedAt: 1 })
      .sort({ position: 1, updatedAt: -1 })
      .toArray();

    const mapped: Note[] = notes.map((n) => ({
      _id: n._id.toString(),
      title: n.title,
      content: n.content || '',
      folderId: n.folderId || undefined,
      position: n.position ?? 0,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    }));

    return res.status(200).json({ success: true, data: mapped });
  }

  if (req.method === 'POST') {
    const { title, folderId, position } = req.body as NoteInput;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }

    const now = new Date();
    const doc: Record<string, unknown> = {
      title: title.trim(),
      content: '',
      position: position ?? 0,
      createdAt: now,
      updatedAt: now,
    };
    if (folderId) doc.folderId = folderId;

    const result = await collection.insertOne(doc);

    const note: Note = {
      _id: result.insertedId.toString(),
      title: title.trim(),
      content: '',
      folderId: folderId || undefined,
      position: position ?? 0,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    return res.status(201).json({ success: true, data: note });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

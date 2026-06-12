import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { Folder } from '@/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid folder ID' });
  }

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(id);
  } catch {
    return res.status(400).json({ success: false, error: 'Invalid folder ID format' });
  }

  const db = await connectToDatabase();
  const foldersCollection = db.collection('folders');
  const notesCollection = db.collection('notes');

  if (req.method === 'PUT') {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Folder name is required' });
    }

    const result = await foldersCollection.findOneAndUpdate(
      { _id: objectId },
      { $set: { name: name.trim(), updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({ success: false, error: 'Folder not found' });
    }

    const folder: Folder = {
      _id: result._id.toString(),
      name: result.name,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
    };

    return res.status(200).json({ success: true, data: folder });
  }

  if (req.method === 'DELETE') {
    const deleteResult = await foldersCollection.deleteOne({ _id: objectId });

    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'Folder not found' });
    }

    const notesDelete = await notesCollection.deleteMany({ folderId: id });

    return res.status(200).json({
      success: true,
      data: {
        deletedFolder: id,
        deletedNotesCount: notesDelete.deletedCount,
      },
    });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

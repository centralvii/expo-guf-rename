import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { getFirestoreDb, isFirebaseConfigured } from '../firebase/client';
import type { TaskRepositoryAdapter, TaskItemDb } from './types';

const TASKS_COLLECTION = 'tasks';

function mapTaskDoc(id: string, data: Record<string, unknown>): TaskItemDb {
  const createdAt = data.createdAt instanceof Timestamp 
    ? data.createdAt.toMillis() 
    : (data.createdAt as number) || Date.now();
  
  const updatedAt = data.updatedAt instanceof Timestamp 
    ? data.updatedAt.toMillis() 
    : (data.updatedAt as number) || Date.now();

  return {
    id,
    title: (data.title as string) || '',
    description: (data.description as string) || '',
    sections: Array.isArray(data.sections) ? data.sections : [],
    priority: (data.priority as TaskItemDb['priority']) ?? 'medium',
    status: (data.status as TaskItemDb['status']) ?? 'open',
    tags: Array.isArray(data.tags) ? data.tags : [],
    createdAt,
    updatedAt,
  };
}

export const FirebaseTaskAdapter: TaskRepositoryAdapter = {
  async checkConnection() {
    if (!isFirebaseConfigured()) {
      throw new Error('Firebase is not configured. Please check your Settings.');
    }
    
    // Try to access Firestore
    getFirestoreDb();
    return true;
  },

  async listTasks() {
    const db = getFirestoreDb();
    const tasksRef = collection(db, TASKS_COLLECTION);
    const q = query(tasksRef, orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => mapTaskDoc(doc.id, doc.data()));
  },

  async createTask(task) {
    const db = getFirestoreDb();
    const now = Date.now();
    
    const docData = {
      ...task,
      createdAt: now,
      updatedAt: now,
    };

    // Use the provided id as document id
    const docRef = doc(db, TASKS_COLLECTION, task.id);
    await setDoc(docRef, docData);

    return {
      id: task.id,
      title: task.title,
      description: task.description,
      sections: task.sections,
      priority: task.priority,
      status: task.status,
      tags: task.tags,
      createdAt: now,
      updatedAt: now,
    };
  },

  async updateTaskById(taskId, updates) {
    const db = getFirestoreDb();
    const docRef = doc(db, TASKS_COLLECTION, taskId);
    
    const updateData = {
      ...updates,
      updatedAt: Date.now(),
    };

    await updateDoc(docRef, updateData);

    // Fetch the updated document
    const updatedDoc = await getDoc(docRef);
    if (!updatedDoc.exists()) {
      throw new Error(`Task ${taskId} not found after update`);
    }

    return mapTaskDoc(taskId, updatedDoc.data());
  },

  async deleteTaskById(taskId) {
    const db = getFirestoreDb();
    const docRef = doc(db, TASKS_COLLECTION, taskId);
    await deleteDoc(docRef);
  },
};

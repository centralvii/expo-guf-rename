import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query, limit,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { getFirestoreDb, isFirebaseConfigured } from '../firebase/client';
import type { TaskHistoryEntry } from '../../types';
import type { TaskRepositoryAdapter, TaskItemDb } from './types';

const TASKS_COLLECTION = 'tasks';
const HISTORY_SUBCOLLECTION = 'history';

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

function toTaskSnapshot(task: TaskItemDb | null) {
  if (!task) {
    return null;
  }

  return {
    ...task,
    tags: task.tags.map((tag) => ({ ...tag })),
    sections: task.sections.map((section) => ({ ...section })),
  };
}

function mapHistoryDoc(taskId: string, id: string, data: Record<string, unknown>): TaskHistoryEntry {
  const createdAt = data.createdAt instanceof Timestamp
    ? data.createdAt.toMillis()
    : (data.createdAt as number) || Date.now();

  return {
    id,
    taskId,
    createdAt,
    type: (data.type as TaskHistoryEntry['type']) ?? 'updated',
    before: data.before && typeof data.before === 'object'
      ? mapTaskDoc((data.before as { id?: string }).id || taskId, data.before as Record<string, unknown>)
      : null,
    after: data.after && typeof data.after === 'object'
      ? mapTaskDoc((data.after as { id?: string }).id || taskId, data.after as Record<string, unknown>)
      : null,
    summary: (data.summary as string | undefined) ?? undefined,
    metadata: data.metadata && typeof data.metadata === 'object'
      ? { ...(data.metadata as Record<string, string>) }
      : undefined,
  };
}

export const FirebaseTaskAdapter: TaskRepositoryAdapter = {
  async checkConnection() {
    if (!isFirebaseConfigured()) {
      throw new Error('Firebase is not configured. Please check your Settings.');
    }

    // Perform lightweight read to verify Firestore access
    const db = getFirestoreDb();
    const tasksRef = collection(db, TASKS_COLLECTION);
    const q = query(tasksRef, limit(1));
    await getDocs(q);
    return true;
  },

  async listTasks() {
    const db = getFirestoreDb();
    const tasksRef = collection(db, TASKS_COLLECTION);
    const q = query(tasksRef, orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => mapTaskDoc(doc.id, doc.data()));
  },

  async getTaskById(taskId) {
    const db = getFirestoreDb();
    const docRef = doc(db, TASKS_COLLECTION, taskId);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    return mapTaskDoc(taskId, snapshot.data());
  },

  async createTask(task) {
    const db = getFirestoreDb();
    const now = Date.now();

    const docData = {
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

  async listTaskHistory(taskId) {
    const db = getFirestoreDb();
    const historyRef = collection(db, TASKS_COLLECTION, taskId, HISTORY_SUBCOLLECTION);
    const historyQuery = query(historyRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(historyQuery);

    return snapshot.docs.map((historyDoc) => mapHistoryDoc(taskId, historyDoc.id, historyDoc.data()));
  },

  async createTaskHistoryEntry(entry) {
    const db = getFirestoreDb();
    const historyRef = collection(db, TASKS_COLLECTION, entry.taskId, HISTORY_SUBCOLLECTION);
    const historyDocRef = doc(historyRef, entry.id);

    const payload = {
      type: entry.type,
      createdAt: entry.createdAt,
      before: toTaskSnapshot(entry.before),
      after: toTaskSnapshot(entry.after),
      summary: entry.summary ?? null,
      metadata: entry.metadata ?? null,
    };

    await setDoc(historyDocRef, payload);

    return {
      ...entry,
      before: toTaskSnapshot(entry.before),
      after: toTaskSnapshot(entry.after),
      metadata: entry.metadata ? { ...entry.metadata } : undefined,
    };
  },
};

import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { BANGLADESH_DIVISIONS, DivisionData } from '../../data/bangladeshDistricts';

export const DIVISIONS_COL = 'divisions';

export interface Division {
  id: string;
  divisionId?: string;
  name: string;
  nameBn?: string;
  bnName?: string;
  slug: string;
  districtCount: number;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export function normalizeDivision(docId: string, data: any): Division {
  return {
    id: docId,
    divisionId: data.divisionId || docId,
    name: data.name || docId,
    nameBn: data.nameBn || data.bnName || '',
    bnName: data.bnName || data.nameBn || '',
    slug: data.slug || docId.toLowerCase().trim(),
    districtCount: typeof data.districtCount === 'number' ? data.districtCount : 0,
    status: data.status || 'active',
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
  };
}

/**
 * Fetch all active divisions from Firestore.
 */
export async function getDivisions(): Promise<Division[]> {
  try {
    const colRef = collection(db, DIVISIONS_COL);
    const snap = await getDocs(colRef);

    if (snap.empty) {
      await seedDivisionsIfEmpty();
      return BANGLADESH_DIVISIONS.map((d) => ({
        id: d.id,
        divisionId: d.id,
        name: d.name,
        nameBn: d.bnName,
        bnName: d.bnName,
        slug: d.id.toLowerCase(),
        districtCount: d.districtCount,
        status: 'active',
      }));
    }

    return snap.docs
      .map((d) => normalizeDivision(d.id, d.data()))
      .filter((d) => d.status === 'active');
  } catch (err) {
    console.warn('getDivisions notice, using local divisions:', err);
    return BANGLADESH_DIVISIONS.map((d) => ({
      id: d.id,
      divisionId: d.id,
      name: d.name,
      nameBn: d.bnName,
      bnName: d.bnName,
      slug: d.id.toLowerCase(),
      districtCount: d.districtCount,
      status: 'active',
    }));
  }
}

/**
 * Get division by ID or slug
 */
export async function getDivisionById(idOrSlug: string): Promise<Division | null> {
  try {
    const cleanId = idOrSlug.toLowerCase().trim();
    // Try direct lookup
    const docRef = doc(db, DIVISIONS_COL, cleanId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return normalizeDivision(snap.id, snap.data());
    }

    // Try query by slug or name
    const q = query(collection(db, DIVISIONS_COL), where('slug', '==', cleanId));
    const querySnap = await getDocs(q);
    if (!querySnap.empty) {
      return normalizeDivision(querySnap.docs[0].id, querySnap.docs[0].data());
    }

    // Local fallback
    const local = BANGLADESH_DIVISIONS.find(
      (d) => d.id === cleanId || d.name.toLowerCase() === cleanId
    );
    if (local) {
      return {
        id: local.id,
        divisionId: local.id,
        name: local.name,
        nameBn: local.bnName,
        bnName: local.bnName,
        slug: local.id.toLowerCase(),
        districtCount: local.districtCount,
        status: 'active',
      };
    }
    return null;
  } catch (err) {
    console.warn('getDivisionById error:', err);
    return null;
  }
}

/**
 * Seed divisions in Firestore if empty. Uses deterministic document IDs to prevent duplication.
 */
export async function seedDivisionsIfEmpty(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, DIVISIONS_COL));
    if (!snap.empty) {
      return;
    }

    const batch = writeBatch(db);
    for (const div of BANGLADESH_DIVISIONS) {
      const docRef = doc(db, DIVISIONS_COL, div.id);
      batch.set(
        docRef,
        {
          divisionId: div.id,
          id: div.id,
          name: div.name,
          nameBn: div.bnName,
          bnName: div.bnName,
          slug: div.id.toLowerCase(),
          districtCount: div.districtCount,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }
    await batch.commit();
  } catch (err) {
    console.warn('seedDivisionsIfEmpty error:', err);
  }
}

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
import { ALL_64_DISTRICTS, DistrictDetail } from '../../data/bangladeshDistricts';
import { DistrictInfo } from '../../types';

export const DISTRICTS_COL = 'districts';

export interface District {
  id: string;
  districtId?: string;
  divisionId?: string;
  division: string;
  divisionName?: string;
  name: string;
  nameBn?: string;
  bnName?: string;
  slug: string;
  specialty: string;
  heroImage: string;
  description: string;
  artisanCount: number;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export function normalizeDistrict(docId: string, data: any): District {
  return {
    id: docId,
    districtId: data.districtId || docId,
    divisionId: data.divisionId || (data.division ? data.division.toLowerCase().trim() : ''),
    division: data.division || data.divisionName || 'Dhaka',
    divisionName: data.divisionName || data.division || 'Dhaka',
    name: data.name || docId,
    nameBn: data.nameBn || data.bnName || '',
    bnName: data.bnName || data.nameBn || '',
    slug: data.slug || docId.toLowerCase().trim(),
    specialty: data.specialty || '',
    heroImage: data.heroImage || '',
    description: data.description || '',
    artisanCount: typeof data.artisanCount === 'number' ? data.artisanCount : 100,
    status: data.status || 'active',
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
  };
}

/**
 * Fetch all active districts from Firestore, optionally filtered by division
 */
export async function getDistricts(divisionNameOrId?: string): Promise<District[]> {
  try {
    let q;
    if (divisionNameOrId && divisionNameOrId.toLowerCase() !== 'all') {
      const cleanDiv = divisionNameOrId.trim();
      q = query(
        collection(db, DISTRICTS_COL),
        where('division', '==', cleanDiv)
      );
    } else {
      q = collection(db, DISTRICTS_COL);
    }

    const snap = await getDocs(q);

    if (snap.empty) {
      if (!divisionNameOrId || divisionNameOrId.toLowerCase() === 'all') {
        await seedDistrictsIfEmpty();
        return ALL_64_DISTRICTS.map((d) => normalizeDistrict(d.id, d));
      }
      // Filter from ALL_64_DISTRICTS
      const filtered = ALL_64_DISTRICTS.filter(
        (d) =>
          d.division.toLowerCase() === divisionNameOrId.toLowerCase() ||
          d.id.toLowerCase() === divisionNameOrId.toLowerCase()
      );
      return filtered.map((d) => normalizeDistrict(d.id, d));
    }

    return snap.docs
      .map((d) => normalizeDistrict(d.id, d.data()))
      .filter((d) => d.status === 'active');
  } catch (err) {
    console.warn('getDistricts error, falling back to local dataset:', err);
    let list = ALL_64_DISTRICTS;
    if (divisionNameOrId && divisionNameOrId.toLowerCase() !== 'all') {
      list = list.filter(
        (d) =>
          d.division.toLowerCase() === divisionNameOrId.toLowerCase() ||
          d.id.toLowerCase() === divisionNameOrId.toLowerCase()
      );
    }
    return list.map((d) => normalizeDistrict(d.id, d));
  }
}

/**
 * Get district by ID or slug
 */
export async function getDistrictById(idOrSlug: string): Promise<District | null> {
  try {
    const cleanId = idOrSlug.toLowerCase().trim();
    // 1. Direct doc lookup
    const docRef = doc(db, DISTRICTS_COL, cleanId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return normalizeDistrict(snap.id, snap.data());
    }

    // 2. Query by slug or name
    const q = query(collection(db, DISTRICTS_COL), where('slug', '==', cleanId));
    const querySnap = await getDocs(q);
    if (!querySnap.empty) {
      return normalizeDistrict(querySnap.docs[0].id, querySnap.docs[0].data());
    }

    // 3. In-memory match
    const local = ALL_64_DISTRICTS.find(
      (d) => d.id.toLowerCase() === cleanId || d.name.toLowerCase() === cleanId
    );
    if (local) {
      return normalizeDistrict(local.id, local);
    }

    return null;
  } catch (err) {
    console.warn('getDistrictById error:', err);
    const local = ALL_64_DISTRICTS.find(
      (d) => d.id.toLowerCase() === idOrSlug.toLowerCase() || d.name.toLowerCase() === idOrSlug.toLowerCase()
    );
    return local ? normalizeDistrict(local.id, local) : null;
  }
}

/**
 * Seed all 64 districts in Firestore if collection is empty.
 * Uses batched writes with deterministic document IDs.
 */
export async function seedDistrictsIfEmpty(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, DISTRICTS_COL));
    if (!snap.empty) {
      return; // Already populated
    }

    // Write in chunks of 30 to stay well under batch limit (500)
    const chunkSize = 30;
    for (let i = 0; i < ALL_64_DISTRICTS.length; i += chunkSize) {
      const chunk = ALL_64_DISTRICTS.slice(i, i + chunkSize);
      const batch = writeBatch(db);

      for (const d of chunk) {
        const docRef = doc(db, DISTRICTS_COL, d.id);
        const payload = {
          districtId: d.id,
          id: d.id,
          divisionId: d.division.toLowerCase().trim(),
          division: d.division,
          name: d.name,
          nameBn: d.bnName || '',
          bnName: d.bnName || '',
          slug: d.id.toLowerCase().trim(),
          specialty: d.specialty,
          heroImage: d.heroImage || '',
          description: d.description,
          artisanCount: d.artisanCount || 100,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        batch.set(docRef, payload, { merge: true });
      }

      await batch.commit();
    }
  } catch (err) {
    console.warn('seedDistrictsIfEmpty error:', err);
  }
}

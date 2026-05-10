import { getSupabaseClient } from './supabase';
import type { PdfDocument, PdfAnnotation } from '../types';

export const PDF_BUCKET = 'pdf_documents';

/**
 * PDF Documents Metadata
 */

export async function fetchPdfDocuments(): Promise<PdfDocument[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('pdf_documents')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw error;

  return (data || []).map((d: any) => ({
    id: d.id,
    name: d.name,
    storagePath: d.storage_path,
    createdAt: new Date(d.created_at).getTime(),
    updatedAt: new Date(d.updated_at).getTime(),
  }));
}

export async function uploadPdfDocument(file: File, name: string): Promise<PdfDocument> {
  const supabase = getSupabaseClient();
  
  // 1. Upload to Storage
  const fileExt = file.name.split('.').pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const filePath = fileName;

  const { error: uploadError } = await supabase.storage
    .from(PDF_BUCKET)
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  // 2. Create DB Entry
  const { data, error: dbError } = await supabase
    .from('pdf_documents')
    .insert([
      {
        name: name || file.name,
        storage_path: filePath,
      },
    ])
    .select()
    .single();

  if (dbError) {
    // Cleanup storage on DB failure
    await supabase.storage.from(PDF_BUCKET).remove([filePath]);
    throw dbError;
  }

  return {
    id: data.id,
    name: data.name,
    storagePath: data.storage_path,
    createdAt: new Date(data.created_at).getTime(),
    updatedAt: new Date(data.updated_at).getTime(),
  };
}

export async function deletePdfDocument(docId: string, storagePath: string): Promise<void> {
  const supabase = getSupabaseClient();

  // DB entry will be deleted via CASCADE if we delete from pdf_documents
  // But we delete DB entry first to trigger cascades, then storage.
  const { error: dbError } = await supabase
    .from('pdf_documents')
    .delete()
    .eq('id', docId);

  if (dbError) throw dbError;

  const { error: storageError } = await supabase.storage
    .from(PDF_BUCKET)
    .remove([storagePath]);

  if (storageError) console.error('Error deleting from storage:', storageError);
}

export async function renamePdfDocument(docId: string, newName: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('pdf_documents')
    .update({ name: newName })
    .eq('id', docId);

  if (error) throw error;
}

export function getPdfPublicUrl(storagePath: string): string {
  const supabase = getSupabaseClient();
  const { data } = supabase.storage.from(PDF_BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

/**
 * PDF Annotations
 */

export async function fetchPdfAnnotations(docId: string): Promise<PdfAnnotation[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('pdf_annotations')
    .select('*')
    .eq('document_id', docId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data || []).map((a: any) => ({
    id: a.id,
    documentId: a.document_id,
    content: a.content,
    pageNumber: a.page_number,
    boundingBox: a.bounding_box,
    textExcerpt: a.text_excerpt,
    createdAt: new Date(a.created_at).getTime(),
  }));
}

export async function addPdfAnnotation(
  annotation: Omit<PdfAnnotation, 'id' | 'createdAt'>
): Promise<PdfAnnotation> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('pdf_annotations')
    .insert([
      {
        document_id: annotation.documentId,
        content: annotation.content,
        page_number: annotation.pageNumber,
        bounding_box: annotation.boundingBox,
        text_excerpt: annotation.textExcerpt,
      },
    ])
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    documentId: data.document_id,
    content: data.content,
    pageNumber: data.page_number,
    boundingBox: data.bounding_box,
    textExcerpt: data.text_excerpt,
    createdAt: new Date(data.created_at).getTime(),
  };
}

export async function deletePdfAnnotation(annotationId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('pdf_annotations')
    .delete()
    .eq('id', annotationId);

  if (error) throw error;
}

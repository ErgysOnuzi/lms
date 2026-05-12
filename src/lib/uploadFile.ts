import { supabase } from './supabaseClient'

/**
 * Uploads a file to the course-content bucket under a structured path.
 * Path: /courses/{courseId}/lessons/{filename}
 */
export async function uploadCourseFile(
  courseId: string,
  file: File,
  subfolder: 'lessons' | 'covers' | 'assignments' = 'lessons'
): Promise<string> {
  const ext = file.name.split('.').pop()
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const path = `courses/${courseId}/${subfolder}/${filename}`

  const { error } = await supabase.storage
    .from('course-content')
    .upload(path, file, { upsert: false })

  if (error) throw error

  const { data } = supabase.storage.from('course-content').getPublicUrl(path)
  return data.publicUrl
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()
  const path = `${userId}/avatar.${ext}`

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true })

  if (error) throw error

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return data.publicUrl
}

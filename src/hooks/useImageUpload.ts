import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'

export function useImageUpload() {
  const [uploading, setUploading] = useState(false)
  const { toast } = useToast()

  const uploadImage = async (file: File, bucket: string = 'product-images'): Promise<string | null> => {
    try {
      setUploading(true)

      // Validate file
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Erro",
          description: "Por favor, selecione um arquivo de imagem válido",
          variant: "destructive"
        })
        return null
      }

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Erro", 
          description: "A imagem deve ter no máximo 5MB",
          variant: "destructive"
        })
        return null
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file)

      if (error) {
        console.error('Upload error:', error)
        toast({
          title: "Erro no upload",
          description: "Não foi possível fazer o upload da imagem",
          variant: "destructive"
        })
        return null
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path)

      toast({
        title: "Sucesso",
        description: "Imagem enviada com sucesso!"
      })

      return publicUrl

    } catch (error) {
      console.error('Error uploading image:', error)
      toast({
        title: "Erro",
        description: "Erro inesperado ao fazer upload da imagem",
        variant: "destructive"
      })
      return null
    } finally {
      setUploading(false)
    }
  }

  const deleteImage = async (url: string, bucket: string = 'product-images'): Promise<boolean> => {
    try {
      // Extract filename from URL
      const urlParts = url.split('/')
      const fileName = urlParts[urlParts.length - 1]

      const { error } = await supabase.storage
        .from(bucket)
        .remove([fileName])

      if (error) {
        console.error('Delete error:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error deleting image:', error)
      return false
    }
  }

  return {
    uploadImage,
    deleteImage,
    uploading
  }
}
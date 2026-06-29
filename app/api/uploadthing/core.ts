import { createUploadthing, type FileRouter } from "uploadthing/next"
import { UploadThingError } from "uploadthing/server"

import { createClient } from "@/lib/supabase/server"

const f = createUploadthing()

const authenticateUser = async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.id) throw new UploadThingError("Unauthorized")

  return { userId: user.id }
}

export const ourFileRouter = {
  projectLogo: f({ image: { maxFileSize: "1MB", maxFileCount: 1 } })
    .middleware(authenticateUser)
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Logo Upload complete for userId:", metadata.userId)
      console.log("file url", file.ufsUrl)
      return { uploadedBy: metadata.userId, fileUrl: file.ufsUrl }
    }),

  projectProductImage: f({ image: { maxFileSize: "1MB", maxFileCount: 1 } })
    .middleware(authenticateUser)
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Product Image Upload complete for userId:", metadata.userId)
      console.log("file url", file.ufsUrl)
      return { uploadedBy: metadata.userId, fileUrl: file.ufsUrl }
    }),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter

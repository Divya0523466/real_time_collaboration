import mongoose from "mongoose"
import Space from "../models/Space.js"
import User from "../models/User.js"

export const isUserSuperAdmin = async (userId) => {
  if (!userId || !mongoose.isValidObjectId(userId)) return false
  const user = await User.findById(userId).select("email role")
  if (!user) return false
  return Boolean(
    user.role === "super_admin" ||
    user.role === "admin" ||
    user.email?.toLowerCase() === "admin@gmail.com"
  )
}

export const getSpaceAccess = async (userId, spaceId) => {
  if (!mongoose.isValidObjectId(spaceId)) {
    return { space: null, isSuperAdmin: false }
  }

  const space = await Space.findById(spaceId)
  if (!space) {
    return { space: null, isSuperAdmin: false }
  }

  const isSuper = await isUserSuperAdmin(userId)
  if (isSuper) {
    return { space, isSuperAdmin: true }
  }

  const isMember = (space.members || []).some(
    (memberId) => memberId.toString() === userId.toString()
  )

  if (!isMember) {
    return { space: null, isSuperAdmin: false }
  }

  return { space, isSuperAdmin: false }
}

export default getSpaceAccess

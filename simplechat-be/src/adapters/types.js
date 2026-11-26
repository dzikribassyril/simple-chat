/**
 * @typedef {Object} AuthAdapter
 * @property {(token: string) => Promise<string>} verifyToken
 *   Verifikasi bearer token, return uid. Throw Error jika invalid.
 * @property {(email: string, password: string, name: string) => Promise<string>} createUser
 *   Buat akun auth baru, return uid.
 *
 * @typedef {Object} Room
 * @property {string} id
 * @property {"direct"|"group"} type
 * @property {string[]} memberIds
 * @property {string} [name]
 *
 * @typedef {Object} DatabaseAdapter
 * @property {(uid: string, name: string) => Promise<void>} ensureProfile
 * @property {(uid: string, name: string) => Promise<void>} updateDisplayName
 * @property {(uid: string, name: string, email: string) => Promise<void>} createProfile
 * @property {(name: string) => Promise<string|null>} findEmailByName
 * @property {(id: string) => Promise<boolean>} userExists
 * @property {(ids: string[]) => Promise<string[]>} findMissingUsers
 * @property {(roomId: string, data: object) => Promise<void>} createRoomWithId
 * @property {(data: object) => Promise<string>} createRoom
 * @property {(roomId: string) => Promise<Room|null>} getRoom
 * @property {(roomId: string, message: object, memberIds: string[]) => Promise<string>} addMessage
 * @property {(roomId: string) => Promise<number>} deleteRoom
 */

export {};

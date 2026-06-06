/**
 * Permission slugs (match values in the database).
 */
export const Permission = {
  UserAdd: "user_add",
  UserEdit: "user_edit",
  UserDelete: "user_delete",
  UserView: "user_view",
  UserRoleAdd: "user_role_add",
  UserRoleView: "user_role_view",
  UserRoleDelete: "user_role_delete",
  DataView: "data_view",
  DataAdd: "data_add",
  DataEdit: "data_edit",
  DataDelete: "data_delete",
} as const

export type PermissionSlug = (typeof Permission)[keyof typeof Permission]

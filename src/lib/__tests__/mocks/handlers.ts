import { http, HttpResponse } from "msw"

const API = "http://localhost:8080"

export const handlers = [
  // GET /api/v1/entity/user/ — success
  http.get(`${API}/api/v1/entity/user/`, () => {
    return HttpResponse.json({
      version: "v1",
      data: [
        {
          id: 1,
          name: "Ivan",
          email: "nobuenhombre@yandex.ru",
          email_verified_at: "2026-06-03T14:52:57.079488Z",
          created_at: "2026-06-03T14:52:57.079488Z",
          updated_at: "2026-06-03T14:52:57.079488Z",
          deleted_at: null,
          roles: "admin",
        },
      ],
      total_count: 1,
    })
  }),

  // POST /api/v1/auth/login — success
  http.post(`${API}/api/v1/auth/login`, () => {
    return HttpResponse.json({
      status: true,
      message: "user logged in successfully",
      data: {
        token: "test-token-123",
        user_id: 1,
        name: "Ivan",
        email: "nobuenhombre@yandex.ru",
      },
    })
  }),

  // POST /api/v1/user/logout — success
  http.post(`${API}/api/v1/user/logout`, () => {
    return HttpResponse.json({
      status: true,
      message: "user logged out successfully",
    })
  }),

  // DELETE /api/v1/entity/user/:id — success
  http.delete(`${API}/api/v1/entity/user/:id`, () => {
    return new HttpResponse(null, { status: 200 })
  }),

  // POST /api/v1/entity/user/:id/restore — success
  http.post(`${API}/api/v1/entity/user/:id/restore`, () => {
    return HttpResponse.json({
      version: "v1",
      data: {
        id: 1,
        name: "Ivan",
        email: "nobuenhombre@yandex.ru",
        email_verified_at: "2026-06-03T14:52:57.079488Z",
        created_at: "2026-06-03T14:52:57.079488Z",
        updated_at: "2026-06-03T14:52:57.079488Z",
        deleted_at: null,
      },
      message: "user restored",
    })
  }),
]
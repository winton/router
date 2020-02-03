import expect from "./expect"
import router from "../src/index"

import loaded from "@fn2/loaded"
import logger from "@fn2/logger"
import tinyId from "@fn2/tiny-id"

beforeEach(() => {
  loaded.reset()
  loaded.load({ logger, router, tinyId })
})

it("routes", () => {
  router.add({
    404: () => "404",
    route: () => "route",
  })

  expect(router.route("/route")).toBe("route")
  expect(router.route("/no-exist")).toBe("404")
})

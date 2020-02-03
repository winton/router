interface InternalRoute {
  cb?: Function
  params?: any
}

export class Router {
  routes = {}
  decode = decodeURIComponent

  constructor(
    routeDefinitions: Record<string, Function> = {}
  ) {
    this.add(routeDefinitions)
  }

  add(routes: Record<string, Function>): void {
    for (const route in routes) {
      this.addOne(route, routes[route])
    }
  }

  addOne(route: string, handler: Function): void {
    const pieces = route.split("/")
    let rules = this.routes

    for (
      let i = +(route[0] === "/");
      i < pieces.length;
      ++i
    ) {
      const piece = pieces[i]

      let name: string

      if (piece[0] === ":") {
        name = ":"
      } else if (piece[0] === "*") {
        name = "*"
      } else {
        name = piece.toLowerCase()
      }

      rules = rules[name] || (rules[name] = {})
      ;(name == ":" || name == "*") &&
        (rules["~"] = piece.slice(1))
    }

    rules["@"] = handler
  }

  route(url: string, arg?: any): any {
    const result = this.lookup(url)

    if (result.cb) {
      return result.cb(result.params, arg, url)
    } else {
      return this.route("/404")
    }
  }

  patchHistory(fn: Function): any {
    window.history.pushState = (
      state: any,
      ...args: any[]
    ): void => {
      fn.call(window.history, state, ...args)

      if (typeof window.onpopstate == "function") {
        window.onpopstate({
          state: state,
        } as PopStateEvent)
      }
    }
  }

  reset(): void {
    this.routes = {}
  }

  private lookup(url: string): InternalRoute {
    const querySplit = this.sanitize(url).split("?")
    const esc = ~url.indexOf("%") ? this.decode : this.noop

    return this.processQuery(
      querySplit[1],
      this.recurseUrl(
        querySplit[0].split("/"),
        esc,
        0,
        this.routes,
        []
      ) || {},
      esc
    )
  }

  private processQuery(
    url: string,
    ctx: InternalRoute,
    esc: Function
  ): InternalRoute {
    if (url && ctx.cb) {
      const hash = url.indexOf("#"),
        query = (hash < 0 ? url : url.slice(0, hash)).split(
          "&"
        )

      for (let i = 0; i < query.length; ++i) {
        const nameValue = query[i].split("=")

        ctx.params[nameValue[0]] = esc(nameValue[1])
      }
    }

    return ctx
  }

  private noop(s: string): string {
    return s
  }

  private recurseUrl(
    pieces: string[],
    esc: Function,
    i: number,
    rules: any,
    params: any
  ): InternalRoute {
    if (!rules) {
      return
    }

    if (i >= pieces.length) {
      const cb = rules["@"]
      return (
        cb && {
          cb: cb,
          params: params.reduce(function(h, kv) {
            h[kv[0]] = kv[1]
            return h
          }, {}),
        }
      )
    }

    const piece = esc(pieces[i])
    const paramLen = params.length
    return (
      this.recurseUrl(
        pieces,
        esc,
        i + 1,
        rules[piece.toLowerCase()],
        params
      ) ||
      this.recurseNamedUrl(
        pieces,
        esc,
        i + 1,
        rules,
        ":",
        piece,
        params,
        paramLen
      ) ||
      this.recurseNamedUrl(
        pieces,
        esc,
        pieces.length,
        rules,
        "*",
        pieces.slice(i).join("/"),
        params,
        paramLen
      )
    )
  }

  private recurseNamedUrl(
    pieces: string[],
    esc: Function,
    i: number,
    rules: any,
    key: string,
    val: any,
    params: any,
    paramLen: number
  ): InternalRoute {
    params.length = paramLen
    const subRules = rules[key]
    subRules && params.push([subRules["~"], val])
    return this.recurseUrl(pieces, esc, i, subRules, params)
  }

  private sanitize(url): string {
    ~url.indexOf("/?") && (url = url.replace("/?", "?"))
    url[0] == "/" && (url = url.slice(1))
    url[url.length - 1] == "/" && (url = url.slice(0, -1))

    return url
  }
}

export default new Router()

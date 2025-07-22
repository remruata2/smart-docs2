
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model CategoryList
 * 
 */
export type CategoryList = $Result.DefaultSelection<Prisma.$CategoryListPayload>
/**
 * Model FileList
 * 
 */
export type FileList = $Result.DefaultSelection<Prisma.$FileListPayload>
/**
 * Model user
 * 
 */
export type user = $Result.DefaultSelection<Prisma.$userPayload>

/**
 * Enums
 */
export namespace $Enums {
  export const UserRole: {
  admin: 'admin',
  staff: 'staff'
};

export type UserRole = (typeof UserRole)[keyof typeof UserRole]

}

export type UserRole = $Enums.UserRole

export const UserRole: typeof $Enums.UserRole

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more CategoryLists
 * const categoryLists = await prisma.categoryList.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more CategoryLists
   * const categoryLists = await prisma.categoryList.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

  /**
   * Add a middleware
   * @deprecated since 4.16.0. For new code, prefer client extensions instead.
   * @see https://pris.ly/d/extensions
   */
  $use(cb: Prisma.Middleware): void

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.categoryList`: Exposes CRUD operations for the **CategoryList** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more CategoryLists
    * const categoryLists = await prisma.categoryList.findMany()
    * ```
    */
  get categoryList(): Prisma.CategoryListDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.fileList`: Exposes CRUD operations for the **FileList** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more FileLists
    * const fileLists = await prisma.fileList.findMany()
    * ```
    */
  get fileList(): Prisma.FileListDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.user`: Exposes CRUD operations for the **user** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Users
    * const users = await prisma.user.findMany()
    * ```
    */
  get user(): Prisma.userDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 6.11.1
   * Query Engine version: f40f79ec31188888a2e33acda0ecc8fd10a853a9
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    CategoryList: 'CategoryList',
    FileList: 'FileList',
    user: 'user'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "categoryList" | "fileList" | "user"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      CategoryList: {
        payload: Prisma.$CategoryListPayload<ExtArgs>
        fields: Prisma.CategoryListFieldRefs
        operations: {
          findUnique: {
            args: Prisma.CategoryListFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CategoryListPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.CategoryListFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CategoryListPayload>
          }
          findFirst: {
            args: Prisma.CategoryListFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CategoryListPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.CategoryListFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CategoryListPayload>
          }
          findMany: {
            args: Prisma.CategoryListFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CategoryListPayload>[]
          }
          create: {
            args: Prisma.CategoryListCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CategoryListPayload>
          }
          createMany: {
            args: Prisma.CategoryListCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.CategoryListCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CategoryListPayload>[]
          }
          delete: {
            args: Prisma.CategoryListDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CategoryListPayload>
          }
          update: {
            args: Prisma.CategoryListUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CategoryListPayload>
          }
          deleteMany: {
            args: Prisma.CategoryListDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.CategoryListUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.CategoryListUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CategoryListPayload>[]
          }
          upsert: {
            args: Prisma.CategoryListUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CategoryListPayload>
          }
          aggregate: {
            args: Prisma.CategoryListAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateCategoryList>
          }
          groupBy: {
            args: Prisma.CategoryListGroupByArgs<ExtArgs>
            result: $Utils.Optional<CategoryListGroupByOutputType>[]
          }
          count: {
            args: Prisma.CategoryListCountArgs<ExtArgs>
            result: $Utils.Optional<CategoryListCountAggregateOutputType> | number
          }
        }
      }
      FileList: {
        payload: Prisma.$FileListPayload<ExtArgs>
        fields: Prisma.FileListFieldRefs
        operations: {
          findUnique: {
            args: Prisma.FileListFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FileListPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.FileListFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FileListPayload>
          }
          findFirst: {
            args: Prisma.FileListFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FileListPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.FileListFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FileListPayload>
          }
          findMany: {
            args: Prisma.FileListFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FileListPayload>[]
          }
          create: {
            args: Prisma.FileListCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FileListPayload>
          }
          createMany: {
            args: Prisma.FileListCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.FileListCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FileListPayload>[]
          }
          delete: {
            args: Prisma.FileListDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FileListPayload>
          }
          update: {
            args: Prisma.FileListUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FileListPayload>
          }
          deleteMany: {
            args: Prisma.FileListDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.FileListUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.FileListUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FileListPayload>[]
          }
          upsert: {
            args: Prisma.FileListUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FileListPayload>
          }
          aggregate: {
            args: Prisma.FileListAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateFileList>
          }
          groupBy: {
            args: Prisma.FileListGroupByArgs<ExtArgs>
            result: $Utils.Optional<FileListGroupByOutputType>[]
          }
          count: {
            args: Prisma.FileListCountArgs<ExtArgs>
            result: $Utils.Optional<FileListCountAggregateOutputType> | number
          }
        }
      }
      user: {
        payload: Prisma.$userPayload<ExtArgs>
        fields: Prisma.userFieldRefs
        operations: {
          findUnique: {
            args: Prisma.userFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$userPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.userFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$userPayload>
          }
          findFirst: {
            args: Prisma.userFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$userPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.userFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$userPayload>
          }
          findMany: {
            args: Prisma.userFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$userPayload>[]
          }
          create: {
            args: Prisma.userCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$userPayload>
          }
          createMany: {
            args: Prisma.userCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.userCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$userPayload>[]
          }
          delete: {
            args: Prisma.userDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$userPayload>
          }
          update: {
            args: Prisma.userUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$userPayload>
          }
          deleteMany: {
            args: Prisma.userDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.userUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.userUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$userPayload>[]
          }
          upsert: {
            args: Prisma.userUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$userPayload>
          }
          aggregate: {
            args: Prisma.UserAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUser>
          }
          groupBy: {
            args: Prisma.userGroupByArgs<ExtArgs>
            result: $Utils.Optional<UserGroupByOutputType>[]
          }
          count: {
            args: Prisma.userCountArgs<ExtArgs>
            result: $Utils.Optional<UserCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Defaults to stdout
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events
     * log: [
     *   { emit: 'stdout', level: 'query' },
     *   { emit: 'stdout', level: 'info' },
     *   { emit: 'stdout', level: 'warn' }
     *   { emit: 'stdout', level: 'error' }
     * ]
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
  }
  export type GlobalOmitConfig = {
    categoryList?: CategoryListOmit
    fileList?: FileListOmit
    user?: userOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type GetLogType<T extends LogLevel | LogDefinition> = T extends LogDefinition ? T['emit'] extends 'event' ? T['level'] : never : never
  export type GetEvents<T extends any> = T extends Array<LogLevel | LogDefinition> ?
    GetLogType<T[0]> | GetLogType<T[1]> | GetLogType<T[2]> | GetLogType<T[3]>
    : never

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  /**
   * These options are being passed into the middleware as "params"
   */
  export type MiddlewareParams = {
    model?: ModelName
    action: PrismaAction
    args: any
    dataPath: string[]
    runInTransaction: boolean
  }

  /**
   * The `T` type makes sure, that the `return proceed` is not forgotten in the middleware implementation
   */
  export type Middleware<T = any> = (
    params: MiddlewareParams,
    next: (params: MiddlewareParams) => $Utils.JsPromise<T>,
  ) => $Utils.JsPromise<T>

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */



  /**
   * Models
   */

  /**
   * Model CategoryList
   */

  export type AggregateCategoryList = {
    _count: CategoryListCountAggregateOutputType | null
    _avg: CategoryListAvgAggregateOutputType | null
    _sum: CategoryListSumAggregateOutputType | null
    _min: CategoryListMinAggregateOutputType | null
    _max: CategoryListMaxAggregateOutputType | null
  }

  export type CategoryListAvgAggregateOutputType = {
    id: number | null
  }

  export type CategoryListSumAggregateOutputType = {
    id: number | null
  }

  export type CategoryListMinAggregateOutputType = {
    id: number | null
    file_no: string | null
    category: string | null
    created_at: Date | null
    updated_at: Date | null
  }

  export type CategoryListMaxAggregateOutputType = {
    id: number | null
    file_no: string | null
    category: string | null
    created_at: Date | null
    updated_at: Date | null
  }

  export type CategoryListCountAggregateOutputType = {
    id: number
    file_no: number
    category: number
    created_at: number
    updated_at: number
    _all: number
  }


  export type CategoryListAvgAggregateInputType = {
    id?: true
  }

  export type CategoryListSumAggregateInputType = {
    id?: true
  }

  export type CategoryListMinAggregateInputType = {
    id?: true
    file_no?: true
    category?: true
    created_at?: true
    updated_at?: true
  }

  export type CategoryListMaxAggregateInputType = {
    id?: true
    file_no?: true
    category?: true
    created_at?: true
    updated_at?: true
  }

  export type CategoryListCountAggregateInputType = {
    id?: true
    file_no?: true
    category?: true
    created_at?: true
    updated_at?: true
    _all?: true
  }

  export type CategoryListAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which CategoryList to aggregate.
     */
    where?: CategoryListWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CategoryLists to fetch.
     */
    orderBy?: CategoryListOrderByWithRelationInput | CategoryListOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: CategoryListWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CategoryLists from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CategoryLists.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned CategoryLists
    **/
    _count?: true | CategoryListCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: CategoryListAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: CategoryListSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: CategoryListMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: CategoryListMaxAggregateInputType
  }

  export type GetCategoryListAggregateType<T extends CategoryListAggregateArgs> = {
        [P in keyof T & keyof AggregateCategoryList]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateCategoryList[P]>
      : GetScalarType<T[P], AggregateCategoryList[P]>
  }




  export type CategoryListGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CategoryListWhereInput
    orderBy?: CategoryListOrderByWithAggregationInput | CategoryListOrderByWithAggregationInput[]
    by: CategoryListScalarFieldEnum[] | CategoryListScalarFieldEnum
    having?: CategoryListScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: CategoryListCountAggregateInputType | true
    _avg?: CategoryListAvgAggregateInputType
    _sum?: CategoryListSumAggregateInputType
    _min?: CategoryListMinAggregateInputType
    _max?: CategoryListMaxAggregateInputType
  }

  export type CategoryListGroupByOutputType = {
    id: number
    file_no: string
    category: string
    created_at: Date | null
    updated_at: Date | null
    _count: CategoryListCountAggregateOutputType | null
    _avg: CategoryListAvgAggregateOutputType | null
    _sum: CategoryListSumAggregateOutputType | null
    _min: CategoryListMinAggregateOutputType | null
    _max: CategoryListMaxAggregateOutputType | null
  }

  type GetCategoryListGroupByPayload<T extends CategoryListGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<CategoryListGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof CategoryListGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], CategoryListGroupByOutputType[P]>
            : GetScalarType<T[P], CategoryListGroupByOutputType[P]>
        }
      >
    >


  export type CategoryListSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    file_no?: boolean
    category?: boolean
    created_at?: boolean
    updated_at?: boolean
  }, ExtArgs["result"]["categoryList"]>

  export type CategoryListSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    file_no?: boolean
    category?: boolean
    created_at?: boolean
    updated_at?: boolean
  }, ExtArgs["result"]["categoryList"]>

  export type CategoryListSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    file_no?: boolean
    category?: boolean
    created_at?: boolean
    updated_at?: boolean
  }, ExtArgs["result"]["categoryList"]>

  export type CategoryListSelectScalar = {
    id?: boolean
    file_no?: boolean
    category?: boolean
    created_at?: boolean
    updated_at?: boolean
  }

  export type CategoryListOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "file_no" | "category" | "created_at" | "updated_at", ExtArgs["result"]["categoryList"]>

  export type $CategoryListPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "CategoryList"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      file_no: string
      category: string
      created_at: Date | null
      updated_at: Date | null
    }, ExtArgs["result"]["categoryList"]>
    composites: {}
  }

  type CategoryListGetPayload<S extends boolean | null | undefined | CategoryListDefaultArgs> = $Result.GetResult<Prisma.$CategoryListPayload, S>

  type CategoryListCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<CategoryListFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: CategoryListCountAggregateInputType | true
    }

  export interface CategoryListDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['CategoryList'], meta: { name: 'CategoryList' } }
    /**
     * Find zero or one CategoryList that matches the filter.
     * @param {CategoryListFindUniqueArgs} args - Arguments to find a CategoryList
     * @example
     * // Get one CategoryList
     * const categoryList = await prisma.categoryList.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends CategoryListFindUniqueArgs>(args: SelectSubset<T, CategoryListFindUniqueArgs<ExtArgs>>): Prisma__CategoryListClient<$Result.GetResult<Prisma.$CategoryListPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one CategoryList that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {CategoryListFindUniqueOrThrowArgs} args - Arguments to find a CategoryList
     * @example
     * // Get one CategoryList
     * const categoryList = await prisma.categoryList.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends CategoryListFindUniqueOrThrowArgs>(args: SelectSubset<T, CategoryListFindUniqueOrThrowArgs<ExtArgs>>): Prisma__CategoryListClient<$Result.GetResult<Prisma.$CategoryListPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first CategoryList that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CategoryListFindFirstArgs} args - Arguments to find a CategoryList
     * @example
     * // Get one CategoryList
     * const categoryList = await prisma.categoryList.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends CategoryListFindFirstArgs>(args?: SelectSubset<T, CategoryListFindFirstArgs<ExtArgs>>): Prisma__CategoryListClient<$Result.GetResult<Prisma.$CategoryListPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first CategoryList that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CategoryListFindFirstOrThrowArgs} args - Arguments to find a CategoryList
     * @example
     * // Get one CategoryList
     * const categoryList = await prisma.categoryList.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends CategoryListFindFirstOrThrowArgs>(args?: SelectSubset<T, CategoryListFindFirstOrThrowArgs<ExtArgs>>): Prisma__CategoryListClient<$Result.GetResult<Prisma.$CategoryListPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more CategoryLists that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CategoryListFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all CategoryLists
     * const categoryLists = await prisma.categoryList.findMany()
     * 
     * // Get first 10 CategoryLists
     * const categoryLists = await prisma.categoryList.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const categoryListWithIdOnly = await prisma.categoryList.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends CategoryListFindManyArgs>(args?: SelectSubset<T, CategoryListFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CategoryListPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a CategoryList.
     * @param {CategoryListCreateArgs} args - Arguments to create a CategoryList.
     * @example
     * // Create one CategoryList
     * const CategoryList = await prisma.categoryList.create({
     *   data: {
     *     // ... data to create a CategoryList
     *   }
     * })
     * 
     */
    create<T extends CategoryListCreateArgs>(args: SelectSubset<T, CategoryListCreateArgs<ExtArgs>>): Prisma__CategoryListClient<$Result.GetResult<Prisma.$CategoryListPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many CategoryLists.
     * @param {CategoryListCreateManyArgs} args - Arguments to create many CategoryLists.
     * @example
     * // Create many CategoryLists
     * const categoryList = await prisma.categoryList.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends CategoryListCreateManyArgs>(args?: SelectSubset<T, CategoryListCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many CategoryLists and returns the data saved in the database.
     * @param {CategoryListCreateManyAndReturnArgs} args - Arguments to create many CategoryLists.
     * @example
     * // Create many CategoryLists
     * const categoryList = await prisma.categoryList.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many CategoryLists and only return the `id`
     * const categoryListWithIdOnly = await prisma.categoryList.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends CategoryListCreateManyAndReturnArgs>(args?: SelectSubset<T, CategoryListCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CategoryListPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a CategoryList.
     * @param {CategoryListDeleteArgs} args - Arguments to delete one CategoryList.
     * @example
     * // Delete one CategoryList
     * const CategoryList = await prisma.categoryList.delete({
     *   where: {
     *     // ... filter to delete one CategoryList
     *   }
     * })
     * 
     */
    delete<T extends CategoryListDeleteArgs>(args: SelectSubset<T, CategoryListDeleteArgs<ExtArgs>>): Prisma__CategoryListClient<$Result.GetResult<Prisma.$CategoryListPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one CategoryList.
     * @param {CategoryListUpdateArgs} args - Arguments to update one CategoryList.
     * @example
     * // Update one CategoryList
     * const categoryList = await prisma.categoryList.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends CategoryListUpdateArgs>(args: SelectSubset<T, CategoryListUpdateArgs<ExtArgs>>): Prisma__CategoryListClient<$Result.GetResult<Prisma.$CategoryListPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more CategoryLists.
     * @param {CategoryListDeleteManyArgs} args - Arguments to filter CategoryLists to delete.
     * @example
     * // Delete a few CategoryLists
     * const { count } = await prisma.categoryList.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends CategoryListDeleteManyArgs>(args?: SelectSubset<T, CategoryListDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more CategoryLists.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CategoryListUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many CategoryLists
     * const categoryList = await prisma.categoryList.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends CategoryListUpdateManyArgs>(args: SelectSubset<T, CategoryListUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more CategoryLists and returns the data updated in the database.
     * @param {CategoryListUpdateManyAndReturnArgs} args - Arguments to update many CategoryLists.
     * @example
     * // Update many CategoryLists
     * const categoryList = await prisma.categoryList.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more CategoryLists and only return the `id`
     * const categoryListWithIdOnly = await prisma.categoryList.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends CategoryListUpdateManyAndReturnArgs>(args: SelectSubset<T, CategoryListUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CategoryListPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one CategoryList.
     * @param {CategoryListUpsertArgs} args - Arguments to update or create a CategoryList.
     * @example
     * // Update or create a CategoryList
     * const categoryList = await prisma.categoryList.upsert({
     *   create: {
     *     // ... data to create a CategoryList
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the CategoryList we want to update
     *   }
     * })
     */
    upsert<T extends CategoryListUpsertArgs>(args: SelectSubset<T, CategoryListUpsertArgs<ExtArgs>>): Prisma__CategoryListClient<$Result.GetResult<Prisma.$CategoryListPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of CategoryLists.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CategoryListCountArgs} args - Arguments to filter CategoryLists to count.
     * @example
     * // Count the number of CategoryLists
     * const count = await prisma.categoryList.count({
     *   where: {
     *     // ... the filter for the CategoryLists we want to count
     *   }
     * })
    **/
    count<T extends CategoryListCountArgs>(
      args?: Subset<T, CategoryListCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], CategoryListCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a CategoryList.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CategoryListAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends CategoryListAggregateArgs>(args: Subset<T, CategoryListAggregateArgs>): Prisma.PrismaPromise<GetCategoryListAggregateType<T>>

    /**
     * Group by CategoryList.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CategoryListGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends CategoryListGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: CategoryListGroupByArgs['orderBy'] }
        : { orderBy?: CategoryListGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, CategoryListGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetCategoryListGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the CategoryList model
   */
  readonly fields: CategoryListFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for CategoryList.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__CategoryListClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the CategoryList model
   */
  interface CategoryListFieldRefs {
    readonly id: FieldRef<"CategoryList", 'Int'>
    readonly file_no: FieldRef<"CategoryList", 'String'>
    readonly category: FieldRef<"CategoryList", 'String'>
    readonly created_at: FieldRef<"CategoryList", 'DateTime'>
    readonly updated_at: FieldRef<"CategoryList", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * CategoryList findUnique
   */
  export type CategoryListFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CategoryList
     */
    select?: CategoryListSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CategoryList
     */
    omit?: CategoryListOmit<ExtArgs> | null
    /**
     * Filter, which CategoryList to fetch.
     */
    where: CategoryListWhereUniqueInput
  }

  /**
   * CategoryList findUniqueOrThrow
   */
  export type CategoryListFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CategoryList
     */
    select?: CategoryListSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CategoryList
     */
    omit?: CategoryListOmit<ExtArgs> | null
    /**
     * Filter, which CategoryList to fetch.
     */
    where: CategoryListWhereUniqueInput
  }

  /**
   * CategoryList findFirst
   */
  export type CategoryListFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CategoryList
     */
    select?: CategoryListSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CategoryList
     */
    omit?: CategoryListOmit<ExtArgs> | null
    /**
     * Filter, which CategoryList to fetch.
     */
    where?: CategoryListWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CategoryLists to fetch.
     */
    orderBy?: CategoryListOrderByWithRelationInput | CategoryListOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for CategoryLists.
     */
    cursor?: CategoryListWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CategoryLists from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CategoryLists.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CategoryLists.
     */
    distinct?: CategoryListScalarFieldEnum | CategoryListScalarFieldEnum[]
  }

  /**
   * CategoryList findFirstOrThrow
   */
  export type CategoryListFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CategoryList
     */
    select?: CategoryListSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CategoryList
     */
    omit?: CategoryListOmit<ExtArgs> | null
    /**
     * Filter, which CategoryList to fetch.
     */
    where?: CategoryListWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CategoryLists to fetch.
     */
    orderBy?: CategoryListOrderByWithRelationInput | CategoryListOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for CategoryLists.
     */
    cursor?: CategoryListWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CategoryLists from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CategoryLists.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of CategoryLists.
     */
    distinct?: CategoryListScalarFieldEnum | CategoryListScalarFieldEnum[]
  }

  /**
   * CategoryList findMany
   */
  export type CategoryListFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CategoryList
     */
    select?: CategoryListSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CategoryList
     */
    omit?: CategoryListOmit<ExtArgs> | null
    /**
     * Filter, which CategoryLists to fetch.
     */
    where?: CategoryListWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of CategoryLists to fetch.
     */
    orderBy?: CategoryListOrderByWithRelationInput | CategoryListOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing CategoryLists.
     */
    cursor?: CategoryListWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` CategoryLists from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` CategoryLists.
     */
    skip?: number
    distinct?: CategoryListScalarFieldEnum | CategoryListScalarFieldEnum[]
  }

  /**
   * CategoryList create
   */
  export type CategoryListCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CategoryList
     */
    select?: CategoryListSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CategoryList
     */
    omit?: CategoryListOmit<ExtArgs> | null
    /**
     * The data needed to create a CategoryList.
     */
    data: XOR<CategoryListCreateInput, CategoryListUncheckedCreateInput>
  }

  /**
   * CategoryList createMany
   */
  export type CategoryListCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many CategoryLists.
     */
    data: CategoryListCreateManyInput | CategoryListCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * CategoryList createManyAndReturn
   */
  export type CategoryListCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CategoryList
     */
    select?: CategoryListSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the CategoryList
     */
    omit?: CategoryListOmit<ExtArgs> | null
    /**
     * The data used to create many CategoryLists.
     */
    data: CategoryListCreateManyInput | CategoryListCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * CategoryList update
   */
  export type CategoryListUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CategoryList
     */
    select?: CategoryListSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CategoryList
     */
    omit?: CategoryListOmit<ExtArgs> | null
    /**
     * The data needed to update a CategoryList.
     */
    data: XOR<CategoryListUpdateInput, CategoryListUncheckedUpdateInput>
    /**
     * Choose, which CategoryList to update.
     */
    where: CategoryListWhereUniqueInput
  }

  /**
   * CategoryList updateMany
   */
  export type CategoryListUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update CategoryLists.
     */
    data: XOR<CategoryListUpdateManyMutationInput, CategoryListUncheckedUpdateManyInput>
    /**
     * Filter which CategoryLists to update
     */
    where?: CategoryListWhereInput
    /**
     * Limit how many CategoryLists to update.
     */
    limit?: number
  }

  /**
   * CategoryList updateManyAndReturn
   */
  export type CategoryListUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CategoryList
     */
    select?: CategoryListSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the CategoryList
     */
    omit?: CategoryListOmit<ExtArgs> | null
    /**
     * The data used to update CategoryLists.
     */
    data: XOR<CategoryListUpdateManyMutationInput, CategoryListUncheckedUpdateManyInput>
    /**
     * Filter which CategoryLists to update
     */
    where?: CategoryListWhereInput
    /**
     * Limit how many CategoryLists to update.
     */
    limit?: number
  }

  /**
   * CategoryList upsert
   */
  export type CategoryListUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CategoryList
     */
    select?: CategoryListSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CategoryList
     */
    omit?: CategoryListOmit<ExtArgs> | null
    /**
     * The filter to search for the CategoryList to update in case it exists.
     */
    where: CategoryListWhereUniqueInput
    /**
     * In case the CategoryList found by the `where` argument doesn't exist, create a new CategoryList with this data.
     */
    create: XOR<CategoryListCreateInput, CategoryListUncheckedCreateInput>
    /**
     * In case the CategoryList was found with the provided `where` argument, update it with this data.
     */
    update: XOR<CategoryListUpdateInput, CategoryListUncheckedUpdateInput>
  }

  /**
   * CategoryList delete
   */
  export type CategoryListDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CategoryList
     */
    select?: CategoryListSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CategoryList
     */
    omit?: CategoryListOmit<ExtArgs> | null
    /**
     * Filter which CategoryList to delete.
     */
    where: CategoryListWhereUniqueInput
  }

  /**
   * CategoryList deleteMany
   */
  export type CategoryListDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which CategoryLists to delete
     */
    where?: CategoryListWhereInput
    /**
     * Limit how many CategoryLists to delete.
     */
    limit?: number
  }

  /**
   * CategoryList without action
   */
  export type CategoryListDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CategoryList
     */
    select?: CategoryListSelect<ExtArgs> | null
    /**
     * Omit specific fields from the CategoryList
     */
    omit?: CategoryListOmit<ExtArgs> | null
  }


  /**
   * Model FileList
   */

  export type AggregateFileList = {
    _count: FileListCountAggregateOutputType | null
    _avg: FileListAvgAggregateOutputType | null
    _sum: FileListSumAggregateOutputType | null
    _min: FileListMinAggregateOutputType | null
    _max: FileListMaxAggregateOutputType | null
  }

  export type FileListAvgAggregateOutputType = {
    id: number | null
  }

  export type FileListSumAggregateOutputType = {
    id: number | null
  }

  export type FileListMinAggregateOutputType = {
    id: number | null
    file_no: string | null
    category: string | null
    title: string | null
    note: string | null
    content_format: string | null
    doc1: string | null
    entry_date: string | null
    entry_date_real: Date | null
    created_at: Date | null
    updated_at: Date | null
  }

  export type FileListMaxAggregateOutputType = {
    id: number | null
    file_no: string | null
    category: string | null
    title: string | null
    note: string | null
    content_format: string | null
    doc1: string | null
    entry_date: string | null
    entry_date_real: Date | null
    created_at: Date | null
    updated_at: Date | null
  }

  export type FileListCountAggregateOutputType = {
    id: number
    file_no: number
    category: number
    title: number
    note: number
    content_format: number
    doc1: number
    entry_date: number
    entry_date_real: number
    created_at: number
    updated_at: number
    _all: number
  }


  export type FileListAvgAggregateInputType = {
    id?: true
  }

  export type FileListSumAggregateInputType = {
    id?: true
  }

  export type FileListMinAggregateInputType = {
    id?: true
    file_no?: true
    category?: true
    title?: true
    note?: true
    content_format?: true
    doc1?: true
    entry_date?: true
    entry_date_real?: true
    created_at?: true
    updated_at?: true
  }

  export type FileListMaxAggregateInputType = {
    id?: true
    file_no?: true
    category?: true
    title?: true
    note?: true
    content_format?: true
    doc1?: true
    entry_date?: true
    entry_date_real?: true
    created_at?: true
    updated_at?: true
  }

  export type FileListCountAggregateInputType = {
    id?: true
    file_no?: true
    category?: true
    title?: true
    note?: true
    content_format?: true
    doc1?: true
    entry_date?: true
    entry_date_real?: true
    created_at?: true
    updated_at?: true
    _all?: true
  }

  export type FileListAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which FileList to aggregate.
     */
    where?: FileListWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FileLists to fetch.
     */
    orderBy?: FileListOrderByWithRelationInput | FileListOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: FileListWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FileLists from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FileLists.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned FileLists
    **/
    _count?: true | FileListCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: FileListAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: FileListSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: FileListMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: FileListMaxAggregateInputType
  }

  export type GetFileListAggregateType<T extends FileListAggregateArgs> = {
        [P in keyof T & keyof AggregateFileList]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateFileList[P]>
      : GetScalarType<T[P], AggregateFileList[P]>
  }




  export type FileListGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: FileListWhereInput
    orderBy?: FileListOrderByWithAggregationInput | FileListOrderByWithAggregationInput[]
    by: FileListScalarFieldEnum[] | FileListScalarFieldEnum
    having?: FileListScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: FileListCountAggregateInputType | true
    _avg?: FileListAvgAggregateInputType
    _sum?: FileListSumAggregateInputType
    _min?: FileListMinAggregateInputType
    _max?: FileListMaxAggregateInputType
  }

  export type FileListGroupByOutputType = {
    id: number
    file_no: string
    category: string
    title: string
    note: string | null
    content_format: string | null
    doc1: string | null
    entry_date: string | null
    entry_date_real: Date | null
    created_at: Date | null
    updated_at: Date | null
    _count: FileListCountAggregateOutputType | null
    _avg: FileListAvgAggregateOutputType | null
    _sum: FileListSumAggregateOutputType | null
    _min: FileListMinAggregateOutputType | null
    _max: FileListMaxAggregateOutputType | null
  }

  type GetFileListGroupByPayload<T extends FileListGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<FileListGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof FileListGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], FileListGroupByOutputType[P]>
            : GetScalarType<T[P], FileListGroupByOutputType[P]>
        }
      >
    >


  export type FileListSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    file_no?: boolean
    category?: boolean
    title?: boolean
    note?: boolean
    content_format?: boolean
    doc1?: boolean
    entry_date?: boolean
    entry_date_real?: boolean
    created_at?: boolean
    updated_at?: boolean
  }, ExtArgs["result"]["fileList"]>

  export type FileListSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    file_no?: boolean
    category?: boolean
    title?: boolean
    note?: boolean
    content_format?: boolean
    doc1?: boolean
    entry_date?: boolean
    entry_date_real?: boolean
    created_at?: boolean
    updated_at?: boolean
  }, ExtArgs["result"]["fileList"]>

  export type FileListSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    file_no?: boolean
    category?: boolean
    title?: boolean
    note?: boolean
    content_format?: boolean
    doc1?: boolean
    entry_date?: boolean
    entry_date_real?: boolean
    created_at?: boolean
    updated_at?: boolean
  }, ExtArgs["result"]["fileList"]>

  export type FileListSelectScalar = {
    id?: boolean
    file_no?: boolean
    category?: boolean
    title?: boolean
    note?: boolean
    content_format?: boolean
    doc1?: boolean
    entry_date?: boolean
    entry_date_real?: boolean
    created_at?: boolean
    updated_at?: boolean
  }

  export type FileListOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "file_no" | "category" | "title" | "note" | "content_format" | "doc1" | "entry_date" | "entry_date_real" | "created_at" | "updated_at", ExtArgs["result"]["fileList"]>

  export type $FileListPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "FileList"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      file_no: string
      category: string
      title: string
      note: string | null
      content_format: string | null
      doc1: string | null
      entry_date: string | null
      entry_date_real: Date | null
      created_at: Date | null
      updated_at: Date | null
    }, ExtArgs["result"]["fileList"]>
    composites: {}
  }

  type FileListGetPayload<S extends boolean | null | undefined | FileListDefaultArgs> = $Result.GetResult<Prisma.$FileListPayload, S>

  type FileListCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<FileListFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: FileListCountAggregateInputType | true
    }

  export interface FileListDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['FileList'], meta: { name: 'FileList' } }
    /**
     * Find zero or one FileList that matches the filter.
     * @param {FileListFindUniqueArgs} args - Arguments to find a FileList
     * @example
     * // Get one FileList
     * const fileList = await prisma.fileList.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends FileListFindUniqueArgs>(args: SelectSubset<T, FileListFindUniqueArgs<ExtArgs>>): Prisma__FileListClient<$Result.GetResult<Prisma.$FileListPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one FileList that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {FileListFindUniqueOrThrowArgs} args - Arguments to find a FileList
     * @example
     * // Get one FileList
     * const fileList = await prisma.fileList.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends FileListFindUniqueOrThrowArgs>(args: SelectSubset<T, FileListFindUniqueOrThrowArgs<ExtArgs>>): Prisma__FileListClient<$Result.GetResult<Prisma.$FileListPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first FileList that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FileListFindFirstArgs} args - Arguments to find a FileList
     * @example
     * // Get one FileList
     * const fileList = await prisma.fileList.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends FileListFindFirstArgs>(args?: SelectSubset<T, FileListFindFirstArgs<ExtArgs>>): Prisma__FileListClient<$Result.GetResult<Prisma.$FileListPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first FileList that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FileListFindFirstOrThrowArgs} args - Arguments to find a FileList
     * @example
     * // Get one FileList
     * const fileList = await prisma.fileList.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends FileListFindFirstOrThrowArgs>(args?: SelectSubset<T, FileListFindFirstOrThrowArgs<ExtArgs>>): Prisma__FileListClient<$Result.GetResult<Prisma.$FileListPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more FileLists that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FileListFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all FileLists
     * const fileLists = await prisma.fileList.findMany()
     * 
     * // Get first 10 FileLists
     * const fileLists = await prisma.fileList.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const fileListWithIdOnly = await prisma.fileList.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends FileListFindManyArgs>(args?: SelectSubset<T, FileListFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FileListPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a FileList.
     * @param {FileListCreateArgs} args - Arguments to create a FileList.
     * @example
     * // Create one FileList
     * const FileList = await prisma.fileList.create({
     *   data: {
     *     // ... data to create a FileList
     *   }
     * })
     * 
     */
    create<T extends FileListCreateArgs>(args: SelectSubset<T, FileListCreateArgs<ExtArgs>>): Prisma__FileListClient<$Result.GetResult<Prisma.$FileListPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many FileLists.
     * @param {FileListCreateManyArgs} args - Arguments to create many FileLists.
     * @example
     * // Create many FileLists
     * const fileList = await prisma.fileList.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends FileListCreateManyArgs>(args?: SelectSubset<T, FileListCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many FileLists and returns the data saved in the database.
     * @param {FileListCreateManyAndReturnArgs} args - Arguments to create many FileLists.
     * @example
     * // Create many FileLists
     * const fileList = await prisma.fileList.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many FileLists and only return the `id`
     * const fileListWithIdOnly = await prisma.fileList.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends FileListCreateManyAndReturnArgs>(args?: SelectSubset<T, FileListCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FileListPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a FileList.
     * @param {FileListDeleteArgs} args - Arguments to delete one FileList.
     * @example
     * // Delete one FileList
     * const FileList = await prisma.fileList.delete({
     *   where: {
     *     // ... filter to delete one FileList
     *   }
     * })
     * 
     */
    delete<T extends FileListDeleteArgs>(args: SelectSubset<T, FileListDeleteArgs<ExtArgs>>): Prisma__FileListClient<$Result.GetResult<Prisma.$FileListPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one FileList.
     * @param {FileListUpdateArgs} args - Arguments to update one FileList.
     * @example
     * // Update one FileList
     * const fileList = await prisma.fileList.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends FileListUpdateArgs>(args: SelectSubset<T, FileListUpdateArgs<ExtArgs>>): Prisma__FileListClient<$Result.GetResult<Prisma.$FileListPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more FileLists.
     * @param {FileListDeleteManyArgs} args - Arguments to filter FileLists to delete.
     * @example
     * // Delete a few FileLists
     * const { count } = await prisma.fileList.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends FileListDeleteManyArgs>(args?: SelectSubset<T, FileListDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more FileLists.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FileListUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many FileLists
     * const fileList = await prisma.fileList.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends FileListUpdateManyArgs>(args: SelectSubset<T, FileListUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more FileLists and returns the data updated in the database.
     * @param {FileListUpdateManyAndReturnArgs} args - Arguments to update many FileLists.
     * @example
     * // Update many FileLists
     * const fileList = await prisma.fileList.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more FileLists and only return the `id`
     * const fileListWithIdOnly = await prisma.fileList.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends FileListUpdateManyAndReturnArgs>(args: SelectSubset<T, FileListUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FileListPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one FileList.
     * @param {FileListUpsertArgs} args - Arguments to update or create a FileList.
     * @example
     * // Update or create a FileList
     * const fileList = await prisma.fileList.upsert({
     *   create: {
     *     // ... data to create a FileList
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the FileList we want to update
     *   }
     * })
     */
    upsert<T extends FileListUpsertArgs>(args: SelectSubset<T, FileListUpsertArgs<ExtArgs>>): Prisma__FileListClient<$Result.GetResult<Prisma.$FileListPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of FileLists.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FileListCountArgs} args - Arguments to filter FileLists to count.
     * @example
     * // Count the number of FileLists
     * const count = await prisma.fileList.count({
     *   where: {
     *     // ... the filter for the FileLists we want to count
     *   }
     * })
    **/
    count<T extends FileListCountArgs>(
      args?: Subset<T, FileListCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], FileListCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a FileList.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FileListAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends FileListAggregateArgs>(args: Subset<T, FileListAggregateArgs>): Prisma.PrismaPromise<GetFileListAggregateType<T>>

    /**
     * Group by FileList.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FileListGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends FileListGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: FileListGroupByArgs['orderBy'] }
        : { orderBy?: FileListGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, FileListGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetFileListGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the FileList model
   */
  readonly fields: FileListFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for FileList.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__FileListClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the FileList model
   */
  interface FileListFieldRefs {
    readonly id: FieldRef<"FileList", 'Int'>
    readonly file_no: FieldRef<"FileList", 'String'>
    readonly category: FieldRef<"FileList", 'String'>
    readonly title: FieldRef<"FileList", 'String'>
    readonly note: FieldRef<"FileList", 'String'>
    readonly content_format: FieldRef<"FileList", 'String'>
    readonly doc1: FieldRef<"FileList", 'String'>
    readonly entry_date: FieldRef<"FileList", 'String'>
    readonly entry_date_real: FieldRef<"FileList", 'DateTime'>
    readonly created_at: FieldRef<"FileList", 'DateTime'>
    readonly updated_at: FieldRef<"FileList", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * FileList findUnique
   */
  export type FileListFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FileList
     */
    select?: FileListSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FileList
     */
    omit?: FileListOmit<ExtArgs> | null
    /**
     * Filter, which FileList to fetch.
     */
    where: FileListWhereUniqueInput
  }

  /**
   * FileList findUniqueOrThrow
   */
  export type FileListFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FileList
     */
    select?: FileListSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FileList
     */
    omit?: FileListOmit<ExtArgs> | null
    /**
     * Filter, which FileList to fetch.
     */
    where: FileListWhereUniqueInput
  }

  /**
   * FileList findFirst
   */
  export type FileListFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FileList
     */
    select?: FileListSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FileList
     */
    omit?: FileListOmit<ExtArgs> | null
    /**
     * Filter, which FileList to fetch.
     */
    where?: FileListWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FileLists to fetch.
     */
    orderBy?: FileListOrderByWithRelationInput | FileListOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for FileLists.
     */
    cursor?: FileListWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FileLists from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FileLists.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of FileLists.
     */
    distinct?: FileListScalarFieldEnum | FileListScalarFieldEnum[]
  }

  /**
   * FileList findFirstOrThrow
   */
  export type FileListFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FileList
     */
    select?: FileListSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FileList
     */
    omit?: FileListOmit<ExtArgs> | null
    /**
     * Filter, which FileList to fetch.
     */
    where?: FileListWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FileLists to fetch.
     */
    orderBy?: FileListOrderByWithRelationInput | FileListOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for FileLists.
     */
    cursor?: FileListWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FileLists from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FileLists.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of FileLists.
     */
    distinct?: FileListScalarFieldEnum | FileListScalarFieldEnum[]
  }

  /**
   * FileList findMany
   */
  export type FileListFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FileList
     */
    select?: FileListSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FileList
     */
    omit?: FileListOmit<ExtArgs> | null
    /**
     * Filter, which FileLists to fetch.
     */
    where?: FileListWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FileLists to fetch.
     */
    orderBy?: FileListOrderByWithRelationInput | FileListOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing FileLists.
     */
    cursor?: FileListWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FileLists from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FileLists.
     */
    skip?: number
    distinct?: FileListScalarFieldEnum | FileListScalarFieldEnum[]
  }

  /**
   * FileList create
   */
  export type FileListCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FileList
     */
    select?: FileListSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FileList
     */
    omit?: FileListOmit<ExtArgs> | null
    /**
     * The data needed to create a FileList.
     */
    data: XOR<FileListCreateInput, FileListUncheckedCreateInput>
  }

  /**
   * FileList createMany
   */
  export type FileListCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many FileLists.
     */
    data: FileListCreateManyInput | FileListCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * FileList createManyAndReturn
   */
  export type FileListCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FileList
     */
    select?: FileListSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the FileList
     */
    omit?: FileListOmit<ExtArgs> | null
    /**
     * The data used to create many FileLists.
     */
    data: FileListCreateManyInput | FileListCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * FileList update
   */
  export type FileListUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FileList
     */
    select?: FileListSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FileList
     */
    omit?: FileListOmit<ExtArgs> | null
    /**
     * The data needed to update a FileList.
     */
    data: XOR<FileListUpdateInput, FileListUncheckedUpdateInput>
    /**
     * Choose, which FileList to update.
     */
    where: FileListWhereUniqueInput
  }

  /**
   * FileList updateMany
   */
  export type FileListUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update FileLists.
     */
    data: XOR<FileListUpdateManyMutationInput, FileListUncheckedUpdateManyInput>
    /**
     * Filter which FileLists to update
     */
    where?: FileListWhereInput
    /**
     * Limit how many FileLists to update.
     */
    limit?: number
  }

  /**
   * FileList updateManyAndReturn
   */
  export type FileListUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FileList
     */
    select?: FileListSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the FileList
     */
    omit?: FileListOmit<ExtArgs> | null
    /**
     * The data used to update FileLists.
     */
    data: XOR<FileListUpdateManyMutationInput, FileListUncheckedUpdateManyInput>
    /**
     * Filter which FileLists to update
     */
    where?: FileListWhereInput
    /**
     * Limit how many FileLists to update.
     */
    limit?: number
  }

  /**
   * FileList upsert
   */
  export type FileListUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FileList
     */
    select?: FileListSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FileList
     */
    omit?: FileListOmit<ExtArgs> | null
    /**
     * The filter to search for the FileList to update in case it exists.
     */
    where: FileListWhereUniqueInput
    /**
     * In case the FileList found by the `where` argument doesn't exist, create a new FileList with this data.
     */
    create: XOR<FileListCreateInput, FileListUncheckedCreateInput>
    /**
     * In case the FileList was found with the provided `where` argument, update it with this data.
     */
    update: XOR<FileListUpdateInput, FileListUncheckedUpdateInput>
  }

  /**
   * FileList delete
   */
  export type FileListDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FileList
     */
    select?: FileListSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FileList
     */
    omit?: FileListOmit<ExtArgs> | null
    /**
     * Filter which FileList to delete.
     */
    where: FileListWhereUniqueInput
  }

  /**
   * FileList deleteMany
   */
  export type FileListDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which FileLists to delete
     */
    where?: FileListWhereInput
    /**
     * Limit how many FileLists to delete.
     */
    limit?: number
  }

  /**
   * FileList without action
   */
  export type FileListDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FileList
     */
    select?: FileListSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FileList
     */
    omit?: FileListOmit<ExtArgs> | null
  }


  /**
   * Model user
   */

  export type AggregateUser = {
    _count: UserCountAggregateOutputType | null
    _avg: UserAvgAggregateOutputType | null
    _sum: UserSumAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  export type UserAvgAggregateOutputType = {
    id: number | null
  }

  export type UserSumAggregateOutputType = {
    id: number | null
  }

  export type UserMinAggregateOutputType = {
    id: number | null
    username: string | null
    password_hash: string | null
    role: $Enums.UserRole | null
    is_active: boolean | null
    last_login: Date | null
    created_at: Date | null
  }

  export type UserMaxAggregateOutputType = {
    id: number | null
    username: string | null
    password_hash: string | null
    role: $Enums.UserRole | null
    is_active: boolean | null
    last_login: Date | null
    created_at: Date | null
  }

  export type UserCountAggregateOutputType = {
    id: number
    username: number
    password_hash: number
    role: number
    is_active: number
    last_login: number
    created_at: number
    _all: number
  }


  export type UserAvgAggregateInputType = {
    id?: true
  }

  export type UserSumAggregateInputType = {
    id?: true
  }

  export type UserMinAggregateInputType = {
    id?: true
    username?: true
    password_hash?: true
    role?: true
    is_active?: true
    last_login?: true
    created_at?: true
  }

  export type UserMaxAggregateInputType = {
    id?: true
    username?: true
    password_hash?: true
    role?: true
    is_active?: true
    last_login?: true
    created_at?: true
  }

  export type UserCountAggregateInputType = {
    id?: true
    username?: true
    password_hash?: true
    role?: true
    is_active?: true
    last_login?: true
    created_at?: true
    _all?: true
  }

  export type UserAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which user to aggregate.
     */
    where?: userWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of users to fetch.
     */
    orderBy?: userOrderByWithRelationInput | userOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: userWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned users
    **/
    _count?: true | UserCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: UserAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: UserSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserMaxAggregateInputType
  }

  export type GetUserAggregateType<T extends UserAggregateArgs> = {
        [P in keyof T & keyof AggregateUser]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUser[P]>
      : GetScalarType<T[P], AggregateUser[P]>
  }




  export type userGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: userWhereInput
    orderBy?: userOrderByWithAggregationInput | userOrderByWithAggregationInput[]
    by: UserScalarFieldEnum[] | UserScalarFieldEnum
    having?: userScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserCountAggregateInputType | true
    _avg?: UserAvgAggregateInputType
    _sum?: UserSumAggregateInputType
    _min?: UserMinAggregateInputType
    _max?: UserMaxAggregateInputType
  }

  export type UserGroupByOutputType = {
    id: number
    username: string
    password_hash: string
    role: $Enums.UserRole
    is_active: boolean | null
    last_login: Date | null
    created_at: Date | null
    _count: UserCountAggregateOutputType | null
    _avg: UserAvgAggregateOutputType | null
    _sum: UserSumAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  type GetUserGroupByPayload<T extends userGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserGroupByOutputType[P]>
            : GetScalarType<T[P], UserGroupByOutputType[P]>
        }
      >
    >


  export type userSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    username?: boolean
    password_hash?: boolean
    role?: boolean
    is_active?: boolean
    last_login?: boolean
    created_at?: boolean
  }, ExtArgs["result"]["user"]>

  export type userSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    username?: boolean
    password_hash?: boolean
    role?: boolean
    is_active?: boolean
    last_login?: boolean
    created_at?: boolean
  }, ExtArgs["result"]["user"]>

  export type userSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    username?: boolean
    password_hash?: boolean
    role?: boolean
    is_active?: boolean
    last_login?: boolean
    created_at?: boolean
  }, ExtArgs["result"]["user"]>

  export type userSelectScalar = {
    id?: boolean
    username?: boolean
    password_hash?: boolean
    role?: boolean
    is_active?: boolean
    last_login?: boolean
    created_at?: boolean
  }

  export type userOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "username" | "password_hash" | "role" | "is_active" | "last_login" | "created_at", ExtArgs["result"]["user"]>

  export type $userPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "user"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      username: string
      password_hash: string
      role: $Enums.UserRole
      is_active: boolean | null
      last_login: Date | null
      created_at: Date | null
    }, ExtArgs["result"]["user"]>
    composites: {}
  }

  type userGetPayload<S extends boolean | null | undefined | userDefaultArgs> = $Result.GetResult<Prisma.$userPayload, S>

  type userCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<userFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UserCountAggregateInputType | true
    }

  export interface userDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['user'], meta: { name: 'user' } }
    /**
     * Find zero or one User that matches the filter.
     * @param {userFindUniqueArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends userFindUniqueArgs>(args: SelectSubset<T, userFindUniqueArgs<ExtArgs>>): Prisma__userClient<$Result.GetResult<Prisma.$userPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one User that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {userFindUniqueOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends userFindUniqueOrThrowArgs>(args: SelectSubset<T, userFindUniqueOrThrowArgs<ExtArgs>>): Prisma__userClient<$Result.GetResult<Prisma.$userPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {userFindFirstArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends userFindFirstArgs>(args?: SelectSubset<T, userFindFirstArgs<ExtArgs>>): Prisma__userClient<$Result.GetResult<Prisma.$userPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {userFindFirstOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends userFindFirstOrThrowArgs>(args?: SelectSubset<T, userFindFirstOrThrowArgs<ExtArgs>>): Prisma__userClient<$Result.GetResult<Prisma.$userPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {userFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Users
     * const users = await prisma.user.findMany()
     * 
     * // Get first 10 Users
     * const users = await prisma.user.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const userWithIdOnly = await prisma.user.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends userFindManyArgs>(args?: SelectSubset<T, userFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$userPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a User.
     * @param {userCreateArgs} args - Arguments to create a User.
     * @example
     * // Create one User
     * const User = await prisma.user.create({
     *   data: {
     *     // ... data to create a User
     *   }
     * })
     * 
     */
    create<T extends userCreateArgs>(args: SelectSubset<T, userCreateArgs<ExtArgs>>): Prisma__userClient<$Result.GetResult<Prisma.$userPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Users.
     * @param {userCreateManyArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends userCreateManyArgs>(args?: SelectSubset<T, userCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Users and returns the data saved in the database.
     * @param {userCreateManyAndReturnArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Users and only return the `id`
     * const userWithIdOnly = await prisma.user.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends userCreateManyAndReturnArgs>(args?: SelectSubset<T, userCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$userPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a User.
     * @param {userDeleteArgs} args - Arguments to delete one User.
     * @example
     * // Delete one User
     * const User = await prisma.user.delete({
     *   where: {
     *     // ... filter to delete one User
     *   }
     * })
     * 
     */
    delete<T extends userDeleteArgs>(args: SelectSubset<T, userDeleteArgs<ExtArgs>>): Prisma__userClient<$Result.GetResult<Prisma.$userPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one User.
     * @param {userUpdateArgs} args - Arguments to update one User.
     * @example
     * // Update one User
     * const user = await prisma.user.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends userUpdateArgs>(args: SelectSubset<T, userUpdateArgs<ExtArgs>>): Prisma__userClient<$Result.GetResult<Prisma.$userPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Users.
     * @param {userDeleteManyArgs} args - Arguments to filter Users to delete.
     * @example
     * // Delete a few Users
     * const { count } = await prisma.user.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends userDeleteManyArgs>(args?: SelectSubset<T, userDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {userUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends userUpdateManyArgs>(args: SelectSubset<T, userUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users and returns the data updated in the database.
     * @param {userUpdateManyAndReturnArgs} args - Arguments to update many Users.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Users and only return the `id`
     * const userWithIdOnly = await prisma.user.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends userUpdateManyAndReturnArgs>(args: SelectSubset<T, userUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$userPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one User.
     * @param {userUpsertArgs} args - Arguments to update or create a User.
     * @example
     * // Update or create a User
     * const user = await prisma.user.upsert({
     *   create: {
     *     // ... data to create a User
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the User we want to update
     *   }
     * })
     */
    upsert<T extends userUpsertArgs>(args: SelectSubset<T, userUpsertArgs<ExtArgs>>): Prisma__userClient<$Result.GetResult<Prisma.$userPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {userCountArgs} args - Arguments to filter Users to count.
     * @example
     * // Count the number of Users
     * const count = await prisma.user.count({
     *   where: {
     *     // ... the filter for the Users we want to count
     *   }
     * })
    **/
    count<T extends userCountArgs>(
      args?: Subset<T, userCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserAggregateArgs>(args: Subset<T, UserAggregateArgs>): Prisma.PrismaPromise<GetUserAggregateType<T>>

    /**
     * Group by User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {userGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends userGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: userGroupByArgs['orderBy'] }
        : { orderBy?: userGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, userGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the user model
   */
  readonly fields: userFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for user.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__userClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the user model
   */
  interface userFieldRefs {
    readonly id: FieldRef<"user", 'Int'>
    readonly username: FieldRef<"user", 'String'>
    readonly password_hash: FieldRef<"user", 'String'>
    readonly role: FieldRef<"user", 'UserRole'>
    readonly is_active: FieldRef<"user", 'Boolean'>
    readonly last_login: FieldRef<"user", 'DateTime'>
    readonly created_at: FieldRef<"user", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * user findUnique
   */
  export type userFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the user
     */
    select?: userSelect<ExtArgs> | null
    /**
     * Omit specific fields from the user
     */
    omit?: userOmit<ExtArgs> | null
    /**
     * Filter, which user to fetch.
     */
    where: userWhereUniqueInput
  }

  /**
   * user findUniqueOrThrow
   */
  export type userFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the user
     */
    select?: userSelect<ExtArgs> | null
    /**
     * Omit specific fields from the user
     */
    omit?: userOmit<ExtArgs> | null
    /**
     * Filter, which user to fetch.
     */
    where: userWhereUniqueInput
  }

  /**
   * user findFirst
   */
  export type userFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the user
     */
    select?: userSelect<ExtArgs> | null
    /**
     * Omit specific fields from the user
     */
    omit?: userOmit<ExtArgs> | null
    /**
     * Filter, which user to fetch.
     */
    where?: userWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of users to fetch.
     */
    orderBy?: userOrderByWithRelationInput | userOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for users.
     */
    cursor?: userWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * user findFirstOrThrow
   */
  export type userFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the user
     */
    select?: userSelect<ExtArgs> | null
    /**
     * Omit specific fields from the user
     */
    omit?: userOmit<ExtArgs> | null
    /**
     * Filter, which user to fetch.
     */
    where?: userWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of users to fetch.
     */
    orderBy?: userOrderByWithRelationInput | userOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for users.
     */
    cursor?: userWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * user findMany
   */
  export type userFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the user
     */
    select?: userSelect<ExtArgs> | null
    /**
     * Omit specific fields from the user
     */
    omit?: userOmit<ExtArgs> | null
    /**
     * Filter, which users to fetch.
     */
    where?: userWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of users to fetch.
     */
    orderBy?: userOrderByWithRelationInput | userOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing users.
     */
    cursor?: userWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` users.
     */
    skip?: number
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * user create
   */
  export type userCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the user
     */
    select?: userSelect<ExtArgs> | null
    /**
     * Omit specific fields from the user
     */
    omit?: userOmit<ExtArgs> | null
    /**
     * The data needed to create a user.
     */
    data: XOR<userCreateInput, userUncheckedCreateInput>
  }

  /**
   * user createMany
   */
  export type userCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many users.
     */
    data: userCreateManyInput | userCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * user createManyAndReturn
   */
  export type userCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the user
     */
    select?: userSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the user
     */
    omit?: userOmit<ExtArgs> | null
    /**
     * The data used to create many users.
     */
    data: userCreateManyInput | userCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * user update
   */
  export type userUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the user
     */
    select?: userSelect<ExtArgs> | null
    /**
     * Omit specific fields from the user
     */
    omit?: userOmit<ExtArgs> | null
    /**
     * The data needed to update a user.
     */
    data: XOR<userUpdateInput, userUncheckedUpdateInput>
    /**
     * Choose, which user to update.
     */
    where: userWhereUniqueInput
  }

  /**
   * user updateMany
   */
  export type userUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update users.
     */
    data: XOR<userUpdateManyMutationInput, userUncheckedUpdateManyInput>
    /**
     * Filter which users to update
     */
    where?: userWhereInput
    /**
     * Limit how many users to update.
     */
    limit?: number
  }

  /**
   * user updateManyAndReturn
   */
  export type userUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the user
     */
    select?: userSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the user
     */
    omit?: userOmit<ExtArgs> | null
    /**
     * The data used to update users.
     */
    data: XOR<userUpdateManyMutationInput, userUncheckedUpdateManyInput>
    /**
     * Filter which users to update
     */
    where?: userWhereInput
    /**
     * Limit how many users to update.
     */
    limit?: number
  }

  /**
   * user upsert
   */
  export type userUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the user
     */
    select?: userSelect<ExtArgs> | null
    /**
     * Omit specific fields from the user
     */
    omit?: userOmit<ExtArgs> | null
    /**
     * The filter to search for the user to update in case it exists.
     */
    where: userWhereUniqueInput
    /**
     * In case the user found by the `where` argument doesn't exist, create a new user with this data.
     */
    create: XOR<userCreateInput, userUncheckedCreateInput>
    /**
     * In case the user was found with the provided `where` argument, update it with this data.
     */
    update: XOR<userUpdateInput, userUncheckedUpdateInput>
  }

  /**
   * user delete
   */
  export type userDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the user
     */
    select?: userSelect<ExtArgs> | null
    /**
     * Omit specific fields from the user
     */
    omit?: userOmit<ExtArgs> | null
    /**
     * Filter which user to delete.
     */
    where: userWhereUniqueInput
  }

  /**
   * user deleteMany
   */
  export type userDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which users to delete
     */
    where?: userWhereInput
    /**
     * Limit how many users to delete.
     */
    limit?: number
  }

  /**
   * user without action
   */
  export type userDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the user
     */
    select?: userSelect<ExtArgs> | null
    /**
     * Omit specific fields from the user
     */
    omit?: userOmit<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const CategoryListScalarFieldEnum: {
    id: 'id',
    file_no: 'file_no',
    category: 'category',
    created_at: 'created_at',
    updated_at: 'updated_at'
  };

  export type CategoryListScalarFieldEnum = (typeof CategoryListScalarFieldEnum)[keyof typeof CategoryListScalarFieldEnum]


  export const FileListScalarFieldEnum: {
    id: 'id',
    file_no: 'file_no',
    category: 'category',
    title: 'title',
    note: 'note',
    content_format: 'content_format',
    doc1: 'doc1',
    entry_date: 'entry_date',
    entry_date_real: 'entry_date_real',
    created_at: 'created_at',
    updated_at: 'updated_at'
  };

  export type FileListScalarFieldEnum = (typeof FileListScalarFieldEnum)[keyof typeof FileListScalarFieldEnum]


  export const UserScalarFieldEnum: {
    id: 'id',
    username: 'username',
    password_hash: 'password_hash',
    role: 'role',
    is_active: 'is_active',
    last_login: 'last_login',
    created_at: 'created_at'
  };

  export type UserScalarFieldEnum = (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'UserRole'
   */
  export type EnumUserRoleFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'UserRole'>
    


  /**
   * Reference to a field of type 'UserRole[]'
   */
  export type ListEnumUserRoleFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'UserRole[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    
  /**
   * Deep Input Types
   */


  export type CategoryListWhereInput = {
    AND?: CategoryListWhereInput | CategoryListWhereInput[]
    OR?: CategoryListWhereInput[]
    NOT?: CategoryListWhereInput | CategoryListWhereInput[]
    id?: IntFilter<"CategoryList"> | number
    file_no?: StringFilter<"CategoryList"> | string
    category?: StringFilter<"CategoryList"> | string
    created_at?: DateTimeNullableFilter<"CategoryList"> | Date | string | null
    updated_at?: DateTimeNullableFilter<"CategoryList"> | Date | string | null
  }

  export type CategoryListOrderByWithRelationInput = {
    id?: SortOrder
    file_no?: SortOrder
    category?: SortOrder
    created_at?: SortOrderInput | SortOrder
    updated_at?: SortOrderInput | SortOrder
  }

  export type CategoryListWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    file_no?: string
    AND?: CategoryListWhereInput | CategoryListWhereInput[]
    OR?: CategoryListWhereInput[]
    NOT?: CategoryListWhereInput | CategoryListWhereInput[]
    category?: StringFilter<"CategoryList"> | string
    created_at?: DateTimeNullableFilter<"CategoryList"> | Date | string | null
    updated_at?: DateTimeNullableFilter<"CategoryList"> | Date | string | null
  }, "id" | "file_no">

  export type CategoryListOrderByWithAggregationInput = {
    id?: SortOrder
    file_no?: SortOrder
    category?: SortOrder
    created_at?: SortOrderInput | SortOrder
    updated_at?: SortOrderInput | SortOrder
    _count?: CategoryListCountOrderByAggregateInput
    _avg?: CategoryListAvgOrderByAggregateInput
    _max?: CategoryListMaxOrderByAggregateInput
    _min?: CategoryListMinOrderByAggregateInput
    _sum?: CategoryListSumOrderByAggregateInput
  }

  export type CategoryListScalarWhereWithAggregatesInput = {
    AND?: CategoryListScalarWhereWithAggregatesInput | CategoryListScalarWhereWithAggregatesInput[]
    OR?: CategoryListScalarWhereWithAggregatesInput[]
    NOT?: CategoryListScalarWhereWithAggregatesInput | CategoryListScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"CategoryList"> | number
    file_no?: StringWithAggregatesFilter<"CategoryList"> | string
    category?: StringWithAggregatesFilter<"CategoryList"> | string
    created_at?: DateTimeNullableWithAggregatesFilter<"CategoryList"> | Date | string | null
    updated_at?: DateTimeNullableWithAggregatesFilter<"CategoryList"> | Date | string | null
  }

  export type FileListWhereInput = {
    AND?: FileListWhereInput | FileListWhereInput[]
    OR?: FileListWhereInput[]
    NOT?: FileListWhereInput | FileListWhereInput[]
    id?: IntFilter<"FileList"> | number
    file_no?: StringFilter<"FileList"> | string
    category?: StringFilter<"FileList"> | string
    title?: StringFilter<"FileList"> | string
    note?: StringNullableFilter<"FileList"> | string | null
    content_format?: StringNullableFilter<"FileList"> | string | null
    doc1?: StringNullableFilter<"FileList"> | string | null
    entry_date?: StringNullableFilter<"FileList"> | string | null
    entry_date_real?: DateTimeNullableFilter<"FileList"> | Date | string | null
    created_at?: DateTimeNullableFilter<"FileList"> | Date | string | null
    updated_at?: DateTimeNullableFilter<"FileList"> | Date | string | null
  }

  export type FileListOrderByWithRelationInput = {
    id?: SortOrder
    file_no?: SortOrder
    category?: SortOrder
    title?: SortOrder
    note?: SortOrderInput | SortOrder
    content_format?: SortOrderInput | SortOrder
    doc1?: SortOrderInput | SortOrder
    entry_date?: SortOrderInput | SortOrder
    entry_date_real?: SortOrderInput | SortOrder
    created_at?: SortOrderInput | SortOrder
    updated_at?: SortOrderInput | SortOrder
  }

  export type FileListWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: FileListWhereInput | FileListWhereInput[]
    OR?: FileListWhereInput[]
    NOT?: FileListWhereInput | FileListWhereInput[]
    file_no?: StringFilter<"FileList"> | string
    category?: StringFilter<"FileList"> | string
    title?: StringFilter<"FileList"> | string
    note?: StringNullableFilter<"FileList"> | string | null
    content_format?: StringNullableFilter<"FileList"> | string | null
    doc1?: StringNullableFilter<"FileList"> | string | null
    entry_date?: StringNullableFilter<"FileList"> | string | null
    entry_date_real?: DateTimeNullableFilter<"FileList"> | Date | string | null
    created_at?: DateTimeNullableFilter<"FileList"> | Date | string | null
    updated_at?: DateTimeNullableFilter<"FileList"> | Date | string | null
  }, "id">

  export type FileListOrderByWithAggregationInput = {
    id?: SortOrder
    file_no?: SortOrder
    category?: SortOrder
    title?: SortOrder
    note?: SortOrderInput | SortOrder
    content_format?: SortOrderInput | SortOrder
    doc1?: SortOrderInput | SortOrder
    entry_date?: SortOrderInput | SortOrder
    entry_date_real?: SortOrderInput | SortOrder
    created_at?: SortOrderInput | SortOrder
    updated_at?: SortOrderInput | SortOrder
    _count?: FileListCountOrderByAggregateInput
    _avg?: FileListAvgOrderByAggregateInput
    _max?: FileListMaxOrderByAggregateInput
    _min?: FileListMinOrderByAggregateInput
    _sum?: FileListSumOrderByAggregateInput
  }

  export type FileListScalarWhereWithAggregatesInput = {
    AND?: FileListScalarWhereWithAggregatesInput | FileListScalarWhereWithAggregatesInput[]
    OR?: FileListScalarWhereWithAggregatesInput[]
    NOT?: FileListScalarWhereWithAggregatesInput | FileListScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"FileList"> | number
    file_no?: StringWithAggregatesFilter<"FileList"> | string
    category?: StringWithAggregatesFilter<"FileList"> | string
    title?: StringWithAggregatesFilter<"FileList"> | string
    note?: StringNullableWithAggregatesFilter<"FileList"> | string | null
    content_format?: StringNullableWithAggregatesFilter<"FileList"> | string | null
    doc1?: StringNullableWithAggregatesFilter<"FileList"> | string | null
    entry_date?: StringNullableWithAggregatesFilter<"FileList"> | string | null
    entry_date_real?: DateTimeNullableWithAggregatesFilter<"FileList"> | Date | string | null
    created_at?: DateTimeNullableWithAggregatesFilter<"FileList"> | Date | string | null
    updated_at?: DateTimeNullableWithAggregatesFilter<"FileList"> | Date | string | null
  }

  export type userWhereInput = {
    AND?: userWhereInput | userWhereInput[]
    OR?: userWhereInput[]
    NOT?: userWhereInput | userWhereInput[]
    id?: IntFilter<"user"> | number
    username?: StringFilter<"user"> | string
    password_hash?: StringFilter<"user"> | string
    role?: EnumUserRoleFilter<"user"> | $Enums.UserRole
    is_active?: BoolNullableFilter<"user"> | boolean | null
    last_login?: DateTimeNullableFilter<"user"> | Date | string | null
    created_at?: DateTimeNullableFilter<"user"> | Date | string | null
  }

  export type userOrderByWithRelationInput = {
    id?: SortOrder
    username?: SortOrder
    password_hash?: SortOrder
    role?: SortOrder
    is_active?: SortOrderInput | SortOrder
    last_login?: SortOrderInput | SortOrder
    created_at?: SortOrderInput | SortOrder
  }

  export type userWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    username?: string
    AND?: userWhereInput | userWhereInput[]
    OR?: userWhereInput[]
    NOT?: userWhereInput | userWhereInput[]
    password_hash?: StringFilter<"user"> | string
    role?: EnumUserRoleFilter<"user"> | $Enums.UserRole
    is_active?: BoolNullableFilter<"user"> | boolean | null
    last_login?: DateTimeNullableFilter<"user"> | Date | string | null
    created_at?: DateTimeNullableFilter<"user"> | Date | string | null
  }, "id" | "username">

  export type userOrderByWithAggregationInput = {
    id?: SortOrder
    username?: SortOrder
    password_hash?: SortOrder
    role?: SortOrder
    is_active?: SortOrderInput | SortOrder
    last_login?: SortOrderInput | SortOrder
    created_at?: SortOrderInput | SortOrder
    _count?: userCountOrderByAggregateInput
    _avg?: userAvgOrderByAggregateInput
    _max?: userMaxOrderByAggregateInput
    _min?: userMinOrderByAggregateInput
    _sum?: userSumOrderByAggregateInput
  }

  export type userScalarWhereWithAggregatesInput = {
    AND?: userScalarWhereWithAggregatesInput | userScalarWhereWithAggregatesInput[]
    OR?: userScalarWhereWithAggregatesInput[]
    NOT?: userScalarWhereWithAggregatesInput | userScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"user"> | number
    username?: StringWithAggregatesFilter<"user"> | string
    password_hash?: StringWithAggregatesFilter<"user"> | string
    role?: EnumUserRoleWithAggregatesFilter<"user"> | $Enums.UserRole
    is_active?: BoolNullableWithAggregatesFilter<"user"> | boolean | null
    last_login?: DateTimeNullableWithAggregatesFilter<"user"> | Date | string | null
    created_at?: DateTimeNullableWithAggregatesFilter<"user"> | Date | string | null
  }

  export type CategoryListCreateInput = {
    file_no: string
    category: string
    created_at?: Date | string | null
    updated_at?: Date | string | null
  }

  export type CategoryListUncheckedCreateInput = {
    id?: number
    file_no: string
    category: string
    created_at?: Date | string | null
    updated_at?: Date | string | null
  }

  export type CategoryListUpdateInput = {
    file_no?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type CategoryListUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    file_no?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type CategoryListCreateManyInput = {
    id?: number
    file_no: string
    category: string
    created_at?: Date | string | null
    updated_at?: Date | string | null
  }

  export type CategoryListUpdateManyMutationInput = {
    file_no?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type CategoryListUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    file_no?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type FileListCreateInput = {
    file_no: string
    category: string
    title: string
    note?: string | null
    content_format?: string | null
    doc1?: string | null
    entry_date?: string | null
    entry_date_real?: Date | string | null
    created_at?: Date | string | null
    updated_at?: Date | string | null
  }

  export type FileListUncheckedCreateInput = {
    id?: number
    file_no: string
    category: string
    title: string
    note?: string | null
    content_format?: string | null
    doc1?: string | null
    entry_date?: string | null
    entry_date_real?: Date | string | null
    created_at?: Date | string | null
    updated_at?: Date | string | null
  }

  export type FileListUpdateInput = {
    file_no?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    note?: NullableStringFieldUpdateOperationsInput | string | null
    content_format?: NullableStringFieldUpdateOperationsInput | string | null
    doc1?: NullableStringFieldUpdateOperationsInput | string | null
    entry_date?: NullableStringFieldUpdateOperationsInput | string | null
    entry_date_real?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type FileListUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    file_no?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    note?: NullableStringFieldUpdateOperationsInput | string | null
    content_format?: NullableStringFieldUpdateOperationsInput | string | null
    doc1?: NullableStringFieldUpdateOperationsInput | string | null
    entry_date?: NullableStringFieldUpdateOperationsInput | string | null
    entry_date_real?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type FileListCreateManyInput = {
    id?: number
    file_no: string
    category: string
    title: string
    note?: string | null
    content_format?: string | null
    doc1?: string | null
    entry_date?: string | null
    entry_date_real?: Date | string | null
    created_at?: Date | string | null
    updated_at?: Date | string | null
  }

  export type FileListUpdateManyMutationInput = {
    file_no?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    note?: NullableStringFieldUpdateOperationsInput | string | null
    content_format?: NullableStringFieldUpdateOperationsInput | string | null
    doc1?: NullableStringFieldUpdateOperationsInput | string | null
    entry_date?: NullableStringFieldUpdateOperationsInput | string | null
    entry_date_real?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type FileListUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    file_no?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    note?: NullableStringFieldUpdateOperationsInput | string | null
    content_format?: NullableStringFieldUpdateOperationsInput | string | null
    doc1?: NullableStringFieldUpdateOperationsInput | string | null
    entry_date?: NullableStringFieldUpdateOperationsInput | string | null
    entry_date_real?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    updated_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type userCreateInput = {
    username: string
    password_hash: string
    role?: $Enums.UserRole
    is_active?: boolean | null
    last_login?: Date | string | null
    created_at?: Date | string | null
  }

  export type userUncheckedCreateInput = {
    id?: number
    username: string
    password_hash: string
    role?: $Enums.UserRole
    is_active?: boolean | null
    last_login?: Date | string | null
    created_at?: Date | string | null
  }

  export type userUpdateInput = {
    username?: StringFieldUpdateOperationsInput | string
    password_hash?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    is_active?: NullableBoolFieldUpdateOperationsInput | boolean | null
    last_login?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type userUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    username?: StringFieldUpdateOperationsInput | string
    password_hash?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    is_active?: NullableBoolFieldUpdateOperationsInput | boolean | null
    last_login?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type userCreateManyInput = {
    id?: number
    username: string
    password_hash: string
    role?: $Enums.UserRole
    is_active?: boolean | null
    last_login?: Date | string | null
    created_at?: Date | string | null
  }

  export type userUpdateManyMutationInput = {
    username?: StringFieldUpdateOperationsInput | string
    password_hash?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    is_active?: NullableBoolFieldUpdateOperationsInput | boolean | null
    last_login?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type userUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    username?: StringFieldUpdateOperationsInput | string
    password_hash?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    is_active?: NullableBoolFieldUpdateOperationsInput | boolean | null
    last_login?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    created_at?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type CategoryListCountOrderByAggregateInput = {
    id?: SortOrder
    file_no?: SortOrder
    category?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type CategoryListAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type CategoryListMaxOrderByAggregateInput = {
    id?: SortOrder
    file_no?: SortOrder
    category?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type CategoryListMinOrderByAggregateInput = {
    id?: SortOrder
    file_no?: SortOrder
    category?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type CategoryListSumOrderByAggregateInput = {
    id?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type FileListCountOrderByAggregateInput = {
    id?: SortOrder
    file_no?: SortOrder
    category?: SortOrder
    title?: SortOrder
    note?: SortOrder
    content_format?: SortOrder
    doc1?: SortOrder
    entry_date?: SortOrder
    entry_date_real?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type FileListAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type FileListMaxOrderByAggregateInput = {
    id?: SortOrder
    file_no?: SortOrder
    category?: SortOrder
    title?: SortOrder
    note?: SortOrder
    content_format?: SortOrder
    doc1?: SortOrder
    entry_date?: SortOrder
    entry_date_real?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type FileListMinOrderByAggregateInput = {
    id?: SortOrder
    file_no?: SortOrder
    category?: SortOrder
    title?: SortOrder
    note?: SortOrder
    content_format?: SortOrder
    doc1?: SortOrder
    entry_date?: SortOrder
    entry_date_real?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type FileListSumOrderByAggregateInput = {
    id?: SortOrder
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type EnumUserRoleFilter<$PrismaModel = never> = {
    equals?: $Enums.UserRole | EnumUserRoleFieldRefInput<$PrismaModel>
    in?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumUserRoleFilter<$PrismaModel> | $Enums.UserRole
  }

  export type BoolNullableFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel> | null
    not?: NestedBoolNullableFilter<$PrismaModel> | boolean | null
  }

  export type userCountOrderByAggregateInput = {
    id?: SortOrder
    username?: SortOrder
    password_hash?: SortOrder
    role?: SortOrder
    is_active?: SortOrder
    last_login?: SortOrder
    created_at?: SortOrder
  }

  export type userAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type userMaxOrderByAggregateInput = {
    id?: SortOrder
    username?: SortOrder
    password_hash?: SortOrder
    role?: SortOrder
    is_active?: SortOrder
    last_login?: SortOrder
    created_at?: SortOrder
  }

  export type userMinOrderByAggregateInput = {
    id?: SortOrder
    username?: SortOrder
    password_hash?: SortOrder
    role?: SortOrder
    is_active?: SortOrder
    last_login?: SortOrder
    created_at?: SortOrder
  }

  export type userSumOrderByAggregateInput = {
    id?: SortOrder
  }

  export type EnumUserRoleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.UserRole | EnumUserRoleFieldRefInput<$PrismaModel>
    in?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumUserRoleWithAggregatesFilter<$PrismaModel> | $Enums.UserRole
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumUserRoleFilter<$PrismaModel>
    _max?: NestedEnumUserRoleFilter<$PrismaModel>
  }

  export type BoolNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel> | null
    not?: NestedBoolNullableWithAggregatesFilter<$PrismaModel> | boolean | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedBoolNullableFilter<$PrismaModel>
    _max?: NestedBoolNullableFilter<$PrismaModel>
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type EnumUserRoleFieldUpdateOperationsInput = {
    set?: $Enums.UserRole
  }

  export type NullableBoolFieldUpdateOperationsInput = {
    set?: boolean | null
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedEnumUserRoleFilter<$PrismaModel = never> = {
    equals?: $Enums.UserRole | EnumUserRoleFieldRefInput<$PrismaModel>
    in?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumUserRoleFilter<$PrismaModel> | $Enums.UserRole
  }

  export type NestedBoolNullableFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel> | null
    not?: NestedBoolNullableFilter<$PrismaModel> | boolean | null
  }

  export type NestedEnumUserRoleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.UserRole | EnumUserRoleFieldRefInput<$PrismaModel>
    in?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.UserRole[] | ListEnumUserRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumUserRoleWithAggregatesFilter<$PrismaModel> | $Enums.UserRole
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumUserRoleFilter<$PrismaModel>
    _max?: NestedEnumUserRoleFilter<$PrismaModel>
  }

  export type NestedBoolNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel> | null
    not?: NestedBoolNullableWithAggregatesFilter<$PrismaModel> | boolean | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedBoolNullableFilter<$PrismaModel>
    _max?: NestedBoolNullableFilter<$PrismaModel>
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}
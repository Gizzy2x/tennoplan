// ---------------------------------------------------------------------------
// @nestjs/swagger stub
//
// warframe-worldstate-parser@5.x decorates every model property with
// ApiProperty / ApiPropertyOptional for OpenAPI schema generation. Those
// decorators produce metadata that's only read when NestJS serves a Swagger
// UI — which we never do. Bundling real @nestjs/swagger would pull in the
// entire NestJS tree (RxJS, Express shims, reflect-metadata chains) and
// blow past the Cloudflare Workers 1 MB bundle limit.
//
// This stub provides no-op decorator factories that satisfy the imports
// and let the parser's classes define cleanly. At runtime the decorators
// do nothing, so the parser still populates real data from the worldstate
// payload via its own constructors.
//
// Aliased in via wrangler.toml [alias]:
//     "@nestjs/swagger" = "./src/stubs/nestjs-swagger.ts"
// ---------------------------------------------------------------------------

/**
 * No-op decorator factory. Returns a PropertyDecorator that does nothing,
 * regardless of what options object was passed (`{ description, type, ... }`).
 */
const noopDecoratorFactory = (..._args: unknown[]): PropertyDecorator =>
  (_target: object, _propertyKey: string | symbol) => { /* intentionally empty */ };

export const ApiProperty          = noopDecoratorFactory;
export const ApiPropertyOptional  = noopDecoratorFactory;
export const ApiHideProperty      = noopDecoratorFactory;
export const ApiExtraModels       = noopDecoratorFactory;

// Class-level decorators that may also be imported by transitive paths
export const ApiTags              = noopDecoratorFactory;
export const ApiOperation         = noopDecoratorFactory;
export const ApiResponse          = noopDecoratorFactory;
export const ApiOkResponse        = noopDecoratorFactory;
export const ApiBadRequestResponse = noopDecoratorFactory;

export default {
  ApiProperty,
  ApiPropertyOptional,
  ApiHideProperty,
  ApiExtraModels,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
};

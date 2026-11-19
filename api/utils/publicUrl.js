// Copyright (c) 2024-2026 nich (@nichxbt). Licensed under the Apache License, Version 2.0.
/**
 * The public-URL guard lives in src/utils/publicUrl.js, because shipped
 * library code (src/analytics/alerts.js) uses it and api/ is not part of the
 * npm package. This re-export keeps the API's imports unchanged.
 *
 * @author nich (@nichxbt)
 * @license Apache-2.0
 */

export { PublicUrlError, isPrivateAddress, assertPublicUrl } from '../../src/utils/publicUrl.js';

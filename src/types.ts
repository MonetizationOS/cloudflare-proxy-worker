export interface FeatureMeterableProperty {
    type: 'meterable';
    hasAccess: boolean;
    remainingUnits?: number;
}

export interface FeatureNumberProperty {
    type: 'number';
    value: number;
}

export interface Feature {
    featureSlug: string;
    properties: Record<string, FeatureMeterableProperty | FeatureNumberProperty>;
    sideEffects: unknown[];
}

export interface SubSurfaceMetadataApi {
    cssSelector?: string | null;
}

export type SetHttpResponse = {
    headers?: Record<string, string>;
    cookies?: string[];
    status: number;
    statusText?: string;
    body: string | null;
};

export type ModifyHttpResponse = {
    addHeaders?: { name: string; value: string }[];
    removeHeaders?: string[];
    addCookies?: string[];
    status?: number;
    statusText?: string;
    body?: string | null;
};

export type SurfaceBehaviorApi = {
    http?: ModifyHttpResponse | SetHttpResponse;
    properties?: Record<string, unknown>;
} & Record<string, unknown>;

export type WebElement =
    | {
          type: 'HTML';
          content: string;
      }
    | {
          type: 'TEXT';
          content: string;
      }
    | ({
          type: 'CUSTOM';
      } & Record<string, unknown>);

export type WebContentSurfaceBehavior = {
    before?: WebElement[];
    remove?: boolean;
    after?: WebElement[];
};

export type SubSurfaceBehaviorApi = {
    content?: WebContentSurfaceBehavior;
    properties?: Record<string, unknown>;
    metadata: SubSurfaceMetadataApi;
} & Record<string, unknown>;

export interface SurfaceDecisionResponse {
    status: 'success';
    identity: {
        identifier: string;
        isAuthenticated: boolean;
        authType: string;
        jwtClaims: Record<string, unknown>;
    };
    features: Record<string, Feature>;
    customer: {
        hasProducts: boolean;
    };
    surfaceBehavior: SurfaceBehaviorApi;
    componentsSkipped: boolean;
    componentBehaviors: Record<string, SubSurfaceBehaviorApi>;
}

export interface SurfaceDecisionError {
    message: string;
    status: 'error';
    statusCode: number;
}

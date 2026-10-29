export interface StateShape {
    fips: string;
    iso: string;
    name: string;
    cx: number;
    cy: number;
    d: string;
}
export interface CountyShape {
    fips: string;
    name: string;
    cx: number;
    cy: number;
    d: string;
}
export declare const VIEWBOX = "0 0 975 610";
export declare const US_STATES: StateShape[];

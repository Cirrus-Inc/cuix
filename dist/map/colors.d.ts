export interface MapColors {
    surface: string;
    border: string;
    borderStrong: string;
    foreground: string;
    foregroundMuted: string;
    accent: string;
    accentSoft: string;
    focusRing: string;
    danger: string;
    chart1: string;
    chart2: string;
    chart3: string;
    chart4: string;
}
/** Whether `name` is a `MapColors` key. */
export declare const isMapColor: (name: string) => name is keyof MapColors;
export declare const own: (name: keyof MapColors) => string;
/** The CSS value of one map colour. */
export declare const mapColor: (name: keyof MapColors) => string;

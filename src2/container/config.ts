/** Typ elementu w modelu C4 */
export type C4ElementType = 'component' | 'container' | 'softwareSystem' | 'person';

/** 
 * Hierarchiczna struktura grup
 * @additionalProperties true
 */
export interface GroupHierarchy {
    [groupName: string]: GroupHierarchy;
}

/** Definicja elementu zewnętrznego */
export interface ExternalElement {
    /** 
     * Typ elementu w modelu C4 
     * @enum {string}
     */
    type: C4ElementType;
}

/** 
 * Konfiguracja kontenera C4 
 * @additionalProperties false
 */
export interface ContainerConfig {
    /** 
     * Nazwa kontenera/serwisu 
     * @minLength 1
     */
    name: string;

    /** 
     * Opis celu kontenera 
     * @minLength 1
     */
    description: string;

    /** 
     * Opcjonalny główny stos technologiczny 
     * @minLength 1
     */
    technology?: string;

    /** 
     * Opcjonalna lista tagów 
     * @uniqueItems true
     */
    tags?: string[];

    /** Opcjonalne własne właściwości */
    properties?: Record<string, string>;

    /** Hierarchiczna struktura grup */
    groups?: GroupHierarchy;

    /** 
     * Wzorce globalne plików źródłowych 
     * @minItems 1
     */
    source: string[];

    /** 
     * Elementy zewnętrzne 
     * @additionalProperties false
     */
    external?: Record<string, ExternalElement>;
} 
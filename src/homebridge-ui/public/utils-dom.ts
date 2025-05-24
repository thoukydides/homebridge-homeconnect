// Homebridge plugin for Home Connect home appliances
// Copyright © 2023-2025 Alexander Thoukydides

import assert from 'assert';

import { assertIsDefined, assertIsInstanceOf } from '../../utils.js';

// A Document, DocumentFragment, or an Element
export interface QuerySelectorAll {
    querySelectorAll(selectors: string): NodeListOf<Element>
}

// Get an HTML element by its "id" attribute
export function getElementById(elementId: string): HTMLElement {
    const element = document.getElementById(elementId);
    assertIsInstanceOf(element, HTMLElement);
    return element;
}

// Get an HTML element using a slot name
export function getSlot(within: QuerySelectorAll, slotName: string): HTMLElement {
    const slots = within.querySelectorAll(`[slot="${slotName}"]`);
    assert.equal(slots.length, 1, `Expected exactly one slot with name "${slotName}"`);
    assertIsInstanceOf(slots[0], HTMLElement);
    return slots[0];
}

// Set the text content of multiple slot elements
export function setSlotText(within: QuerySelectorAll, slotText: Record<string, string>): void {
    for (const [slotName, text] of Object.entries(slotText))
        getSlot(within, slotName).textContent = text;
}

// Create a copy of a template element
export function cloneTemplate(elementId: string, slotText?: Record<string, string>): DocumentFragment {
    // Find the template element
    const template = document.getElementById(elementId);
    assertIsInstanceOf(template, HTMLTemplateElement);

    // Clone the template's document-fragment and set slot values
    const documentFragment = template.content.cloneNode(true);
    assertIsInstanceOf(documentFragment, DocumentFragment);
    if (slotText) setSlotText(documentFragment, slotText);
    return documentFragment;
}

// Make URI paths absolute
export function elementWithAbsolutePaths<Type extends QuerySelectorAll>(fragment: Type): Type {
    for (const attribute of ['href', 'src']) {
        const elements = fragment.querySelectorAll(`[${attribute}]`);
        for (const element of Array.from(elements)) {
            const path = element.getAttribute(attribute);
            assertIsDefined(path);
            element.setAttribute(attribute, new URL(path, location.href).href);
        }
    }
    return fragment;
}

// Obtain the HTML serialization of a template element
export function getHTML(fragment: Node): string {
    const serializer = new XMLSerializer();
    return serializer.serializeToString(fragment);
}
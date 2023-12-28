// Homebridge plugin for Home Connect home appliances
// Copyright © 2023 Alexander Thoukydides

import { Logger } from 'homebridge';

import { HomeAppliance } from '../../api-types';
import { assertIsInstanceOf } from '../../utils';
import { cloneTemplate, getElementById, getSlot } from './utils-dom';


// Description for a card
export interface CardDescription {
    id:         string;
    icon:       string;
    name:       string;
    detail?:    string;
}

// Cards to select global or per-appliance configuration
export class Cards {

    // HTML element that has the cards as children
    readonly parentElement: HTMLElement;

    // Current cards
    nonApplianceCards:  CardDescription[] = [];
    applianceCards:     CardDescription[] = [];

    // The currently selected card
    selectedCardId?: string;
    onSelect?: (id?: string) => void;

    // Construct a new cards handler
    constructor(readonly log: Logger) {
        this.parentElement = getElementById('hc-appliance-cards');
    }

    // Update the list of non-appliance cards
    setNonAppliances(cards: CardDescription[]): void {
        this.nonApplianceCards = cards;
        this.updateCards();
    }

    // Update the list of appliances
    setAppliances(appliances: HomeAppliance[]) {
        // Convert the appliances to card descriptions
        const applianceCards = appliances.map(appliance => ({
            id:     appliance.haId,
            icon:   appliance.type.toLocaleLowerCase(),
            name:   appliance.name,
            detail: `${appliance.brand} ${appliance.enumber}`
        }));
        applianceCards.sort((a, b) => a.name.localeCompare(b.name));

        // Check whether the list of appliances has changed
        if (JSON.stringify(applianceCards) !== JSON.stringify(this.applianceCards)) {
            this.applianceCards = applianceCards;
            this.updateCards();
        }
    }

    // Update the list of cards and restore the selection, if still valid
    updateCards() {
        // Replace the existing cards with new ones
        const allCards = [...this.nonApplianceCards, ...this.applianceCards];
        this.parentElement.replaceChildren(...allCards.map(card => this.makeCard(card)));
        this.parentElement.hidden = !allCards.length;

        // Restore any previous selection
        this.selectCard(this.selectedCardId);
    }


    // Create a new card
    makeCard({ id, icon, name, detail }: CardDescription): DocumentFragment {
        // Create a new card from the template
        if (detail === undefined) detail = ' '; // (non-breaking space)
        const card = cloneTemplate('hc-appliance-card', { name, detail });
        getSlot(card, 'icon').setAttribute('src', `./images/icon-${icon}.svg`);

        // Handle card selection
        const element = card.children[0];
        assertIsInstanceOf(element, HTMLElement);
        element.dataset.id = id;
        element.onclick = () => this.selectCard(id);
        return card;
    }

    // A card has been selected
    selectCard(id?: string) {
        // Select this card and deselect all others
        let selectedCard: HTMLElement | undefined;
        for (const card of Array.from(this.parentElement.children)) {
            assertIsInstanceOf(card, HTMLElement);
            if (card.dataset.id === id) selectedCard = card;
            card.classList.toggle('hc-selected', card.dataset.id === id);
        }
        if (!selectedCard) id = undefined;

        // Notify the client of selection changes
        if (this.selectedCardId !== id) {
            this.log.debug(`onSelect(${id}) (was ${this.selectedCardId})`);
            this.selectedCardId = id;
            this.onSelect?.(id);
        }
    }
}

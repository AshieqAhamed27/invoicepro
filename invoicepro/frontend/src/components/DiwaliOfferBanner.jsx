import React, { useState, useEffect } from 'react';

// ============================================================
// DIWALI OFFER CONFIG — Campaign Ended
// ============================================================
export const DISCOUNT_PCT = 0;

export const isDiwaliOfferActive = () => false;

export const getDiwaliDiscount = () => null;

export function getTimeLeft() {
  return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
}

export default function DiwaliOfferBanner() {
  return null;
}

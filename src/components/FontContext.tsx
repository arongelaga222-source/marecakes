"use client";

import React, { createContext, useContext, useState } from "react";
import { FONT_OPTIONS, FontCustomizer, FontOption } from "./FontCustomizer";

interface FontContextValue {
  selectedFont: FontOption;
  setSelectedFont: (font: FontOption) => void;
}

const FontContext = createContext<FontContextValue>({
  selectedFont: FONT_OPTIONS[0],
  setSelectedFont: () => {},
});

export function FontProvider({ children }: { children: React.ReactNode }) {
  const [selectedFont, setSelectedFont] = useState<FontOption>(FONT_OPTIONS[0]);

  return (
    <FontContext.Provider value={{ selectedFont, setSelectedFont }}>
      <div
        className="min-h-full flex flex-col"
        style={
          {
            "--current-font-heading": selectedFont.headingCss,
            "--current-font-body": selectedFont.bodyCss,
            fontFamily: selectedFont.bodyCss,
          } as React.CSSProperties
        }
      >
        {children}
        <FontCustomizer
          currentFont={selectedFont.id}
          onSelectFont={(font) => setSelectedFont(font)}
        />
      </div>
    </FontContext.Provider>
  );
}

export function useActiveFont(): FontContextValue {
  return useContext(FontContext);
}

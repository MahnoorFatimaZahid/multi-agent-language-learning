"use client";
import React, { useState } from "react";
import { motion, AnimatePresence, useTransform, useMotionValue, useSpring } from "framer-motion";

export const AnimatedTooltip = ({
  items,
}: {
  items: { id: number; name: string; designation: string; flag: string }[];
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const springConfig = { stiffness: 100, damping: 5 };
  const x = useMotionValue(0);
  const rotate = useSpring(useTransform(x, [-100, 100], [-45, 45]), springConfig);
  const translateX = useSpring(useTransform(x, [-100, 100], [-50, 50]), springConfig);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const halfWidth = event.currentTarget.offsetWidth / 2;
    x.set(event.nativeEvent.offsetX - halfWidth);
  };

  return (
    <div className="flex flex-row items-center justify-center gap-2 flex-wrap">
      {items.map((item) => (
        <div
          key={item.id}
          className="relative group"
          onMouseEnter={() => setHoveredIndex(item.id)}
          onMouseLeave={() => setHoveredIndex(null)}
          onMouseMove={handleMouseMove}
        >
          <AnimatePresence mode="popLayout">
            {hoveredIndex === item.id && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.6 }}
                animate={{ opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 260, damping: 10 } }}
                exit={{ opacity: 0, y: 20, scale: 0.6 }}
                style={{ translateX, rotate }}
                className="absolute -top-16 left-1/2 -translate-x-1/2 flex flex-col items-center z-50"
              >
                <div className="bg-ink text-paper px-3 py-1.5 rounded-xl text-xs whitespace-nowrap shadow-xl">
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-white/60 text-[10px]">{item.designation}</p>
                </div>
                <div className="w-2 h-2 bg-ink rotate-45 -mt-1" />
              </motion.div>
            )}
          </AnimatePresence>
          <div className="w-12 h-12 rounded-2xl bg-white border-2 border-border flex items-center justify-center text-2xl hover:border-accent/40 hover:scale-110 transition-all duration-200 cursor-default shadow-sm">
            {item.flag}
          </div>
        </div>
      ))}
    </div>
  );
};
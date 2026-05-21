"use client";
import { useEffect } from "react";
import { motion, stagger, useAnimate } from "framer-motion";
import { cn } from "../../app/libs/utils";

export const TextGenerateEffect = ({
  words,
  className,
}: {
  words: string;
  className?: string;
}) => {
  const [scope, animate] = useAnimate();
  const wordsArray = words.split(" ");

  useEffect(() => {
    animate(
      "span",
      { opacity: 1 },
      { duration: 1, delay: stagger(0.15) }
    );
  }, [animate]);

  return (
    <motion.div ref={scope} className={cn("font-semibold", className)}>
      {wordsArray.map((word, i) => (
        <motion.span key={i} className="opacity-0 inline-block mr-2">
          {word}
        </motion.span>
      ))}
    </motion.div>
  );
};
import { useEffect } from "react";

function useKeyboard(shortcuts) {
  useEffect(() => {

    const handleKey = (e) => {

      const tag =
        document.activeElement.tagName;

      if (
        tag === "INPUT" ||
        tag === "TEXTAREA"
      ) {
        return;
      }

      shortcuts.forEach((shortcut) => {

        const ctrlMatch =
          !!shortcut.ctrl === e.ctrlKey;

        const keyMatch =
          shortcut.key.toLowerCase() ===
          e.key.toLowerCase();

        if (ctrlMatch && keyMatch) {
          e.preventDefault();
          shortcut.action();
        }
      });
    };

    window.addEventListener(
      "keydown",
      handleKey
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKey
      );
    };

  }, [shortcuts]);
}

export default useKeyboard;
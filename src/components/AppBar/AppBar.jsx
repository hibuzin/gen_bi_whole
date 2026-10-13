import styles from "./AppBar.module.css";
import { useState, useEffect, useRef } from "react";

const languages = [
  {
    code: "en",
    label: "ENGLISH",
    flag: "https://flagcdn.com/w40/gb.png",
  },
  {
    code: "ta",
    label: "தமிழ்",
    flag: "https://flagcdn.com/w40/in.png",
  },
];

function AppBar({ lang, setLang }) {
  const [langOpen, setLangOpen] =
    useState(false);

  const langRef = useRef(null);

  const user = JSON.parse(
    localStorage.getItem("user")
  );

  const changeLang = (code) => {
    setLang(code);
    localStorage.setItem("lang", code);
    setLangOpen(false);
  };

  useEffect(() => {
    const saved =
      localStorage.getItem("lang");

    if (saved) {
      setLang(saved);
    }
  }, []);

  useEffect(() => {
    const handleOutside = (e) => {
      if (
        langRef.current &&
        !langRef.current.contains(e.target)
      ) {
        setLangOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutside
    );

    return () =>
      document.removeEventListener(
        "mousedown",
        handleOutside
      );
  }, []);

  const active =
    languages.find(
      (l) => l.code === lang
    ) || languages[0];

  return (
    <div className={styles.appbar}>

      <div className={styles.left}>
  <h2 className={styles.logoText}>
       Fuel your sales by our Brand New Billing & Accounting Software 
  </h2>
</div>
{/*
      <div className={styles.right}>
        <div
          ref={langRef}
          className={`${styles.langBox} ${
            langOpen
              ? styles.langOpen
              : ""
          }`}
          onClick={() =>
            setLangOpen((p) => !p)
          }
        >
          <img
            src={active.flag}
            alt={active.label}
            className={styles.flag}
          />

          <span className={styles.langLabel}>
            {active.label}
          </span>

          <span
            className={`${styles.langChevron} ${
              langOpen
                ? styles.rotated
                : ""
            }`}
          >
            ›
          </span>

          {langOpen && (
            <div
              className={
                styles.langDropdown
              }
            >
              {languages.map((l) => (
                <div
                  key={l.code}
                  className={`${
                    styles.langOption
                  } ${
                    lang === l.code
                      ? styles.langSelected
                      : ""
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    changeLang(l.code);
                  }}
                >
                  <img
                    src={l.flag}
                    alt={l.label}
                    className={
                      styles.flag
                    }
                  />

                  <span
                    className={
                      styles.langOptionName
                    }
                  >
                    {l.label}
                  </span>

                  {lang === l.code && (
                    <span
                      className={
                        styles.langCheck
                      }
                    >
                      ✓
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div> */}
    </div>
  );
}

export default AppBar;
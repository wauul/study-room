"use client";

import { useLanguage } from "@/components/LanguageProvider";
/** An instructional diagram, not a screenshot or a record of user activity. */
export default function StudyMethod() {
  const { t } = useLanguage();
  return (
    <figure className="study-method" aria-labelledby="method-title">
      <figcaption id="method-title">{t("A way to study, together")}</figcaption>
      <div className="method-source">
        <span className="margin-key">[1]</span>
        <div>
          <strong>{t("Start with your course notes")}</strong>
          <p>{t("Every answer points back to the passages it uses.")}</p>
        </div>
      </div>
      <div className="method-question">
        <span className="margin-key">?</span>
        <p>
          {t("Ask what you don’t understand.")}
          <br />
          <strong>{t("Read the evidence together.")}</strong>
        </p>
      </div>
      <div className="method-confidence">
        <div className="row between">
          <strong>{t("Then, check your confidence")}</strong>
          <span className="numeric">100%</span>
        </div>
        <div
          className="confidence-example"
          aria-label={t("Example distribution: A 50%, B 30%, C 15%, D 5%")}
        >
          {[50, 30, 15, 5].map((value, i) => (
            <div key={value} style={{ flex: value }}>
              <span>{String.fromCharCode(65 + i)}</span>
              <span>{value}%</span>
            </div>
          ))}
        </div>
        <p className="method-caption">
          {t("Example distribution. Four answers, one honest forecast.")}
        </p>
      </div>
      <p className="method-end">
        {t("Leave with evidence of what to revisit")}
      </p>
    </figure>
  );
}

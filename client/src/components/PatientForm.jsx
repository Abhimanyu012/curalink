import React from 'react';
import { useChatStore } from '../store/chatStore';

const FIELDS = [
  { key: 'patientName', label: 'Patient Name',       placeholder: 'e.g. Alice Johnson', required: false },
  { key: 'disease',     label: 'Disease / Condition', placeholder: 'e.g. Type 2 Diabetes', required: true  },
  { key: 'location',   label: 'Location',            placeholder: 'e.g. United States',   required: false },
];

export default function PatientForm() {
  const { patientContext, setPatientContext } = useChatStore();

  return (
    <form className="patient-form" onSubmit={(e) => e.preventDefault()}>
      {FIELDS.map(({ key, label, placeholder, required }) => (
        <div key={key} className="form-field">
          <label className="form-label" htmlFor={`field-${key}`}>
            {label}
            {required && <span className="required">*</span>}
          </label>
          <input
            id={`field-${key}`}
            className="form-input"
            type="text"
            placeholder={placeholder}
            value={patientContext[key] || ''}
            onChange={(e) => setPatientContext({ [key]: e.target.value })}
            autoComplete="off"
            spellCheck="false"
          />
        </div>
      ))}
    </form>
  );
}

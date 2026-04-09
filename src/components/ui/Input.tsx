import { cn } from '@/lib/utils'
import { InputHTMLAttributes } from 'react'

export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10)
  if (digits.length < 4) return digits
  if (digits.length < 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
}

interface PhoneInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type'> {
  label?: string
  error?: string
  value: string
  onChange: (value: string) => void
}

export function PhoneInput({ label, error, className, id, value, onChange, ...props }: PhoneInputProps) {
  return (
    <Input
      label={label}
      error={error}
      id={id}
      type="tel"
      value={value}
      onChange={e => onChange(formatPhone(e.target.value))}
      placeholder="555-000-0000"
      className={className}
      {...props}
    />
  )
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(
          'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400',
          'focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent',
          error && 'border-red-400',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function Textarea({ label, error, className, id, ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={cn(
          'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 resize-none',
          'focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent',
          error && 'border-red-400',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export function Select({ label, error, options, className, id, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <select
        id={id}
        className={cn(
          'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white',
          'focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent',
          error && 'border-red-400',
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

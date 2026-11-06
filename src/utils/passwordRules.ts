export const newPasswordHint = 'Co najmniej 8 znaków, jedna duża litera i jeden znak specjalny (np. !).'

export function newPasswordError(password: string): string {
  if ([...password].length < 8) return 'Hasło musi mieć co najmniej 8 znaków.'
  if (new TextEncoder().encode(password).length > 72) return 'Hasło może mieć najwyżej 72 bajty UTF-8.'
  if (!/\p{Lu}/u.test(password)) return 'Hasło musi zawierać co najmniej jedną dużą literę.'
  if (!/[\p{P}\p{S}]/u.test(password)) return 'Hasło musi zawierać co najmniej jeden znak specjalny.'
  return ''
}

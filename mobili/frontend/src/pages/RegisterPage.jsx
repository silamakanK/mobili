import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { register as registerService } from '../services/auth'
import { useState } from 'react'

export default function RegisterPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm()

  const password = watch('password')

  async function onSubmit(data) {
    setServerError(null)
    try {
      const { confirmPassword, ...payload } = data
      const res = await registerService(payload)
      const resData = res.data?.data || res.data
      login(resData.user, resData.token)
      navigate('/dashboard')
    } catch (err) {
      setServerError(err.response?.data?.error || err.response?.data?.message || 'Une erreur est survenue. Veuillez réessayer.')
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="text-primary font-bold text-headline-md">Mobili</Link>
          <h1 className="text-headline-sm text-on-surface mt-4">Créer un compte</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Rejoignez Mobili en quelques secondes
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-card space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-label-lg text-on-surface-variant mb-1">Prénom</label>
              <input
                type="text"
                {...register('firstName', { required: 'Requis' })}
                className="w-full border border-outline-variant rounded-lg px-3 py-3 text-body-md text-on-surface bg-surface-container focus:outline-none focus:border-primary"
                placeholder="Mamadou"
              />
              {errors.firstName && (
                <p className="text-body-sm text-error mt-1">{errors.firstName.message}</p>
              )}
            </div>
            <div>
              <label className="block text-label-lg text-on-surface-variant mb-1">Nom</label>
              <input
                type="text"
                {...register('lastName', { required: 'Requis' })}
                className="w-full border border-outline-variant rounded-lg px-3 py-3 text-body-md text-on-surface bg-surface-container focus:outline-none focus:border-primary"
                placeholder="Diallo"
              />
              {errors.lastName && (
                <p className="text-body-sm text-error mt-1">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-label-lg text-on-surface-variant mb-1">Email</label>
            <input
              type="email"
              {...register('email', {
                required: 'L\'email est requis',
                pattern: { value: /^\S+@\S+\.\S+$/, message: 'Email invalide' },
              })}
              className="w-full border border-outline-variant rounded-lg px-3 py-3 text-body-md text-on-surface bg-surface-container focus:outline-none focus:border-primary"
              placeholder="vous@exemple.com"
            />
            {errors.email && (
              <p className="text-body-sm text-error mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-label-lg text-on-surface-variant mb-1">Téléphone</label>
            <input
              type="tel"
              {...register('phone', {
                required: 'Le téléphone est requis',
                pattern: { value: /^\+?[0-9]{8,15}$/, message: 'Numéro invalide' },
              })}
              className="w-full border border-outline-variant rounded-lg px-3 py-3 text-body-md text-on-surface bg-surface-container focus:outline-none focus:border-primary"
              placeholder="+223 XX XX XX XX"
            />
            {errors.phone && (
              <p className="text-body-sm text-error mt-1">{errors.phone.message}</p>
            )}
          </div>

          <div>
            <label className="block text-label-lg text-on-surface-variant mb-1">Mot de passe</label>
            <input
              type="password"
              {...register('password', {
                required: 'Le mot de passe est requis',
                minLength: { value: 8, message: 'Minimum 8 caractères' },
              })}
              className="w-full border border-outline-variant rounded-lg px-3 py-3 text-body-md text-on-surface bg-surface-container focus:outline-none focus:border-primary"
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="text-body-sm text-error mt-1">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label className="block text-label-lg text-on-surface-variant mb-1">Confirmer le mot de passe</label>
            <input
              type="password"
              {...register('confirmPassword', {
                required: 'Veuillez confirmer votre mot de passe',
                validate: (v) => v === password || 'Les mots de passe ne correspondent pas',
              })}
              className="w-full border border-outline-variant rounded-lg px-3 py-3 text-body-md text-on-surface bg-surface-container focus:outline-none focus:border-primary"
              placeholder="••••••••"
            />
            {errors.confirmPassword && (
              <p className="text-body-sm text-error mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>

          {serverError && (
            <div className="bg-error-container text-on-error-container rounded-lg p-3 flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>error</span>
              <p className="text-body-sm">{serverError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary text-on-primary py-4 rounded-xl text-body-md font-semibold hover:bg-primary-container transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isSubmitting && (
              <span className="animate-spin w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full" />
            )}
            Créer mon compte
          </button>
        </form>

        <p className="text-center text-body-sm text-on-surface-variant mt-6">
          Déjà un compte ?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}

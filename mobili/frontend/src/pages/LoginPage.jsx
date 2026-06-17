import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { login as loginService } from '../services/auth'
import { useState } from 'react'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm()

  async function onSubmit(data) {
    setServerError(null)
    try {
      const res = await loginService(data)
      const payload = res.data?.data || res.data
      login(payload.user, payload.token)
      navigate('/dashboard')
    } catch (err) {
      setServerError(err.response?.data?.message || 'Email ou mot de passe incorrect.')
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="text-primary font-bold text-headline-md">Mobili</Link>
          <h1 className="text-headline-sm text-on-surface mt-4">Connexion</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Heureux de vous revoir !
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-card space-y-4">
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
            <label className="block text-label-lg text-on-surface-variant mb-1">Mot de passe</label>
            <input
              type="password"
              {...register('password', { required: 'Le mot de passe est requis' })}
              className="w-full border border-outline-variant rounded-lg px-3 py-3 text-body-md text-on-surface bg-surface-container focus:outline-none focus:border-primary"
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="text-body-sm text-error mt-1">{errors.password.message}</p>
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
            Se connecter
          </button>
        </form>

        <p className="text-center text-body-sm text-on-surface-variant mt-6">
          Pas encore de compte ?{' '}
          <Link to="/register" className="text-primary font-medium hover:underline">
            S&apos;inscrire
          </Link>
        </p>
      </div>
    </div>
  )
}

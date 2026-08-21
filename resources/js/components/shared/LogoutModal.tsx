import { Link } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import { LogOut, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LogoutModalProps {
    open: boolean;
    onClose: () => void;
    userName?: string;
}

export default function LogoutModal({ open, onClose, userName }: LogoutModalProps) {
    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center px-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 12 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-white/10 shadow-2xl backdrop-blur-2xl"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="logout-modal-title"
                    >
                        <button
                            onClick={onClose}
                            aria-label="Cerrar"
                            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                        >
                            <X className="h-4 w-4" />
                        </button>

                        <div className="flex flex-col items-center px-6 py-8 text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15">
                                <LogOut className="h-6 w-6 text-red-400" />
                            </div>

                            <h2 id="logout-modal-title" className="mt-4 text-lg font-bold text-white">
                                ¿Cerrar sesión?
                            </h2>
                            <p className="mt-1.5 text-sm text-white/70">
                                {userName ? (
                                    <>
                                        Saldrás de la cuenta de{' '}
                                        <span className="font-medium text-white">{userName}</span>.
                                    </>
                                ) : (
                                    'Vas a salir de tu cuenta.'
                                )}
                            </p>

                            <div className="mt-6 flex w-full gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1 border-white/15 bg-white/5 text-white hover:bg-white/10"
                                    onClick={onClose}
                                >
                                    Cancelar
                                </Button>
                                <Link href="/logout" method="post" as="button" className="flex-1">
                                    <Button
                                        type="submit"
                                        variant="destructive"
                                        className="w-full"
                                    >
                                        Cerrar sesión
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

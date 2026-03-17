import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalFooter } from "./Modal"
import { Button } from "./Button"
import { AlertTriangle, CheckCircle, XCircle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

type ConfirmType = "alert" | "confirm" | "error" | "success"

interface ConfirmModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type?: ConfirmType
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void
  onCancel?: () => void
}

const typeConfig = {
  alert: { Icon: Info, iconBg: "bg-blue-100 dark:bg-blue-900/30", iconColor: "text-blue-600 dark:text-blue-400" },
  confirm: { Icon: AlertTriangle, iconBg: "bg-amber-100 dark:bg-amber-900/30", iconColor: "text-amber-600 dark:text-amber-400" },
  error: { Icon: XCircle, iconBg: "bg-red-100 dark:bg-red-900/30", iconColor: "text-red-600 dark:text-red-400" },
  success: { Icon: CheckCircle, iconBg: "bg-green-100 dark:bg-green-900/30", iconColor: "text-green-600 dark:text-green-400" },
}

export function ConfirmModal({
  open,
  onOpenChange,
  type = "confirm",
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const { Icon, iconBg, iconColor } = typeConfig[type]

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent size="sm" className="text-center">
        <ModalHeader className="items-center">
          <div className={cn("mx-auto flex h-12 w-12 items-center justify-center rounded-full", iconBg)}>
            <Icon className={cn("h-6 w-6", iconColor)} />
          </div>
          <ModalTitle className="text-center">{title}</ModalTitle>
          {description && <ModalDescription className="text-center">{description}</ModalDescription>}
        </ModalHeader>
        <ModalFooter className="justify-center">
          {type === "confirm" && onCancel && (
            <Button variant="secondary" onClick={() => { onCancel?.(); onOpenChange(false); }}>
              {cancelText}
            </Button>
          )}
          <Button
            variant={type === "error" ? "danger" : "primary"}
            onClick={() => { onConfirm?.(); onOpenChange(false); }}
          >
            {confirmText}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type Props = {
  isOpen: boolean,
  onOpenChange: (open: boolean) => void,
}

export default function PasswordDialog({ isOpen, onOpenChange }: Props) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Password</DialogTitle>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
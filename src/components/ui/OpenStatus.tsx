interface OpenStatusProps {
  isOpen: boolean | null;
}

export default function OpenStatus({ isOpen }: OpenStatusProps) {
  if (isOpen === null) return null;

  return (
    <span
      className={`text-tag font-medium ${
        isOpen ? "text-green-700" : "text-ls-secondary"
      }`}
    >
      {isOpen ? "Open Now" : "Closed"}
    </span>
  );
}

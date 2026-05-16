"""Domain exceptions surfaced to HTTP clients."""


class InferenceNotReadyError(Exception):
    """Raised when trained checkpoint and scaler are not both available."""

    def __init__(self, message: str):
        self.message = message
        super().__init__(message)

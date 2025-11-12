'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Loader2, RotateCcw } from 'lucide-react'

interface GameState {
  board: (string | number)[]
  board_display: string
  positions_filled: string[]
  available_moves: number[]
}

interface LastMove {
  player: string
  position: number
  result: string
}

interface GameResponse {
  game_state: GameState
  last_move: LastMove
  game_status: string
  winner: string
  message: string
  next_action: string
  status: string
  metadata: {
    move_count: number
    timestamp: string
  }
}

function getPositionCoords(position: number): { row: number; col: number } {
  return {
    row: Math.floor((position - 1) / 3),
    col: (position - 1) % 3
  }
}

function Cell({ position, value, onClick, isAvailable }: { position: number; value: string | number; onClick: () => void; isAvailable: boolean }) {
  let displayValue = ''
  let textColor = 'text-gray-400'
  let bgColor = 'bg-gray-800'

  if (value === 'X') {
    displayValue = 'X'
    textColor = 'text-blue-400'
    bgColor = 'bg-gray-700'
  } else if (value === 'O') {
    displayValue = 'O'
    textColor = 'text-red-400'
    bgColor = 'bg-gray-700'
  } else if (isAvailable) {
    bgColor = 'bg-gray-700 hover:bg-gray-600 cursor-pointer'
  }

  return (
    <button
      onClick={onClick}
      disabled={!isAvailable}
      className={`w-20 h-20 ${bgColor} border border-gray-600 text-3xl font-bold ${textColor} transition-colors duration-200 rounded-lg flex items-center justify-center`}
    >
      {displayValue}
    </button>
  )
}

function GameBoard({ gameState, onCellClick, isLoading }: { gameState: GameState | null; onCellClick: (position: number) => void; isLoading: boolean }) {
  const board = gameState?.board || [1, 2, 3, 4, 5, 6, 7, 8, 9]
  const availableMoves = gameState?.available_moves || []

  return (
    <div className="grid grid-cols-3 gap-3 p-6 bg-gray-800 rounded-xl">
      {board.map((cell, index) => {
        const position = index + 1
        return (
          <Cell
            key={position}
            position={position}
            value={cell}
            onClick={() => !isLoading && onCellClick(position)}
            isAvailable={availableMoves.includes(position) && !isLoading}
          />
        )
      })}
    </div>
  )
}

function GameInfo({ gameState, gameStatus }: { gameState: GameState | null; gameStatus: string | null }) {
  const moveCount = gameState && 'metadata' in gameState ? (gameState as any).metadata?.move_count || 0 : 0

  return (
    <div className="space-y-3">
      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
        <p className="text-gray-400 text-sm">Moves Made</p>
        <p className="text-white text-2xl font-bold">{moveCount}</p>
      </div>

      {gameStatus === 'in_progress' && (
        <div className="bg-blue-900 p-4 rounded-lg border border-blue-700">
          <p className="text-blue-200 text-sm">Current Turn</p>
          <p className="text-blue-100 font-semibold">Your move (X)</p>
        </div>
      )}

      {gameStatus === 'won' && (
        <div className="bg-green-900 p-4 rounded-lg border border-green-700">
          <p className="text-green-200 text-sm">Game Result</p>
          <p className="text-green-100 font-semibold">Game Over!</p>
        </div>
      )}

      {gameStatus === 'draw' && (
        <div className="bg-yellow-900 p-4 rounded-lg border border-yellow-700">
          <p className="text-yellow-200 text-sm">Game Result</p>
          <p className="text-yellow-100 font-semibold">It's a Draw!</p>
        </div>
      )}
    </div>
  )
}

function WinnerModal({ winner, isOpen, onClose }: { winner: string; isOpen: boolean; onClose: () => void }) {
  const isPlayerWin = winner === 'X'
  const isDraw = winner === 'none'
  const title = isPlayerWin ? 'You Won!' : isPlayerWin === false && !isDraw ? 'AI Won!' : "It's a Draw!"
  const description = isPlayerWin
    ? 'Congratulations! You defeated the AI.'
    : !isDraw
      ? 'The AI outplayed you this time. Want to try again?'
      : 'Great match! No winner this time.'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border border-gray-700">
        <DialogTitle className="text-2xl font-bold text-white">{title}</DialogTitle>
        <DialogDescription className="text-gray-300 text-base">{description}</DialogDescription>
        <div className="flex gap-3 pt-4">
          <Button onClick={onClose} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
            Play Again
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function TicTacToe() {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [gameStatus, setGameStatus] = useState<string>('in_progress')
  const [winner, setWinner] = useState<string | null>(null)
  const [showWinnerModal, setShowWinnerModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('Starting new game...')
  const [error, setError] = useState<string | null>(null)

  const AGENT_ID = '6914372f83addc655aec4b11'

  async function makeMove(position: number) {
    if (loading) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `move ${position}`,
          agent_id: AGENT_ID
        })
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      console.log('Move response:', data)

      if (data.success && data.response) {
        const gameData = typeof data.response === 'string' ? JSON.parse(data.response) : data.response

        setGameState(gameData.game_state)
        setGameStatus(gameData.game_status)
        setMessage(gameData.message)

        if (gameData.game_status === 'won' || gameData.game_status === 'draw') {
          setWinner(gameData.winner)
          setShowWinnerModal(true)
        }
      } else {
        setError(data.error || 'Failed to process move')
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMsg)
      console.error('Move error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function startNewGame() {
    setLoading(true)
    setError(null)
    setWinner(null)
    setShowWinnerModal(false)
    setGameStatus('in_progress')

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'new game',
          agent_id: AGENT_ID
        })
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      console.log('New game response:', data)

      if (data.success && data.response) {
        const gameData = typeof data.response === 'string' ? JSON.parse(data.response) : data.response
        setGameState(gameData.game_state)
        setGameStatus(gameData.game_status)
        setMessage(gameData.message)
      } else {
        setError(data.error || 'Failed to start new game')
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMsg)
      console.error('New game error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    startNewGame()
  }, [])

  const handleCellClick = (position: number) => {
    makeMove(position)
  }

  const handlePlayAgain = () => {
    setShowWinnerModal(false)
    startNewGame()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        <Card className="bg-gray-900 border border-gray-700 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-white">Tic Tac Toe</CardTitle>
            <p className="text-gray-400 text-sm mt-2">Play against the AI</p>
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <div className="bg-red-900 border border-red-700 p-4 rounded-lg">
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            )}

            <div className="flex justify-center">
              {loading && <Loader2 className="animate-spin text-blue-400" size={32} />}
              {!loading && gameState && <GameBoard gameState={gameState} onCellClick={handleCellClick} isLoading={loading} />}
            </div>

            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <p className="text-gray-400 text-sm">Status</p>
              <p className="text-white font-semibold mt-1">{message}</p>
            </div>

            <GameInfo gameState={gameState as any} gameStatus={gameStatus} />

            <Button
              onClick={startNewGame}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg flex items-center justify-center gap-2"
            >
              <RotateCcw size={18} />
              New Game
            </Button>
          </CardContent>
        </Card>
      </div>

      {winner && <WinnerModal winner={winner} isOpen={showWinnerModal} onClose={handlePlayAgain} />}
    </div>
  )
}
